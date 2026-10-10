"""Job admission: validate, reserve, then allow a provider to be called."""

import hmac
import json
import os
import re
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from secrets import token_hex
from typing import Literal, Protocol
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.jobs.ledger import (
    ACTIVE,
    RESULT_TTL,
    Ledger,
    LedgerError,
    day_key,
    digest,
    parse_stamp,
    stamp,
    zero_usage,
)
from app.jobs.privacy import access_event, contains_location
from app.movement.clean import RawGap, RawSample, clean_trace

MAX_BODY_BYTES = 1_048_576
MAX_SAMPLES = 3000
_LOCKED_GEMMA_ATTEMPTS = 4
_LOCKED_GPU_SECONDS = 240
_LOCKED_MUSIC_ATTEMPTS = 6


def _release_cap(name: str, locked: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return locked
    try:
        value = int(raw)
    except ValueError:
        return locked
    if value < 1:
        return locked
    return min(value, locked)


GEMMA_ATTEMPT_LIMIT = _release_cap("MAX_GEMMA_ATTEMPTS_PER_DAY", _LOCKED_GEMMA_ATTEMPTS)
GPU_SECOND_LIMIT = _release_cap("MAX_GEMMA_GPU_SECONDS_PER_DAY", _LOCKED_GPU_SECONDS)
ELEVEN_ATTEMPT_LIMIT = _release_cap("MAX_MUSIC_ATTEMPTS_PER_DAY", _LOCKED_MUSIC_ATTEMPTS)
GEMMA_RESERVE_ATTEMPTS = 1
GPU_RESERVE_SECONDS = 60
ELEVEN_RESERVE_ATTEMPTS = 1

_IDEMPOTENCY = re.compile(r"[A-Za-z0-9._:-]{8,128}")
_CAPABILITY = re.compile(r"[0-9a-fA-F]{64}")
_JOB_ID = re.compile(r"[0-9a-f]{32}")

_ERRORS: dict[str, tuple[int, str, bool, str]] = {
    "invalid_request": (
        400,
        "The walk request is not valid.",
        False,
        "Check the walk and try again.",
    ),
    "payload_too_large": (
        413,
        "The walk is too large to submit.",
        False,
        "Record a shorter walk.",
    ),
    "trace_too_short": (
        422,
        "That walk was too short to shape a piece.",
        False,
        "Record another walk.",
    ),
    "trace_unclear": (
        422,
        "The location was too unclear to trust.",
        False,
        "Record another walk.",
    ),
    "conflicting_request": (
        409,
        "This retry does not match the original request.",
        False,
        "Retry the original request.",
    ),
    "active_job": (
        409,
        "A piece is already being made.",
        False,
        "Wait for the current piece to finish.",
    ),
    "generation_limit": (
        429,
        "Today's limit for new pieces has been reached.",
        False,
        "Hear an example, or try again tomorrow.",
    ),
    "invalid_capability": (
        401,
        "That key does not match this piece.",
        False,
        "Open the piece from the same walk.",
    ),
    "not_found": (
        404,
        "That piece is not available.",
        False,
        "Start another walk, or hear an example.",
    ),
    "expired": (
        410,
        "This piece has expired.",
        False,
        "Start another walk.",
    ),
    "processing_unavailable": (
        503,
        "Generation is unavailable right now.",
        True,
        "Try again later.",
    ),
}


class JobError(Exception):
    def __init__(self, code: str) -> None:
        status, message, retryable, next_action = _ERRORS[code]
        self.status = status
        self.code = code
        self.body = {
            "code": code,
            "message": message,
            "retryable": retryable,
            "next_action": next_action,
        }
        self.headers = {"WWW-Authenticate": "Bearer"} if status == 401 else {}

    def envelope(self) -> dict[str, object]:
        return {**self.body, "request_id": uuid4().hex}


class ProviderDispatch(Protocol):
    def start(self, job_id: str) -> None:
        """Called only after the reservation is durable. May raise if the outcome is unknown."""


class NoProviderDispatch:
    """P3.1 reserves budget and does not call Gemma or Eleven."""

    def start(self, job_id: str) -> None:
        return None


class JobView:
    def __init__(self, job: dict[str, object], now: datetime) -> None:
        created = parse_stamp(str(job["created_at"]))
        elapsed = int((now - created).total_seconds() * 1000)
        error = job.get("error")
        self.job_id = str(job["job_id"])
        self.status = str(job["status"])
        self.stage = str(job["stage"])
        self.elapsed_ms = max(0, elapsed)
        self.mode = job.get("mode") if isinstance(job.get("mode"), str) else None
        self.error = error if isinstance(error, dict) else None
        stored = job.get("result")
        self.result = stored if isinstance(stored, dict) else None

    def public(self) -> dict[str, object]:
        return {
            "schema_version": "1",
            "job_id": self.job_id,
            "status": self.status,
            "stage": self.stage,
            "elapsed_ms": self.elapsed_ms,
            "mode": self.mode,
            "error": self.error,
            "result": self.result,
        }


class JobService:
    def __init__(
        self,
        data_dir: Path,
        *,
        ledger_path: Path | None = None,
        artifacts_dir: Path | None = None,
        now: Callable[[], datetime] | None = None,
        dispatch: ProviderDispatch | None = None,
    ) -> None:
        clock = now or _utcnow
        self.data_dir = data_dir
        self.now = clock
        self.ledger = Ledger(ledger_path or (data_dir / "quota-ledger.json"), clock)
        self.artifacts = artifacts_dir or (data_dir / "artifacts")
        self.dispatch = dispatch or NoProviderDispatch()
        if hasattr(self.dispatch, "complete") and self.dispatch.complete is None:
            self.dispatch.complete = self.complete
        self._cleanup_existing_store()

    def _cleanup_existing_store(self) -> None:
        if not self.ledger.path.is_file():
            return
        try:
            self._run(lambda _data: None)
        except JobError:
            return

    def capabilities(self) -> dict[str, object]:
        accepting = self._accepting()
        return {
            "schema_version": "1",
            "modes": ["route_sketch", "cached_example"],
            "limits": {
                "max_samples": MAX_SAMPLES,
                "max_body_bytes": MAX_BODY_BYTES,
                "one_active_job": True,
            },
            "generation": "open" if accepting else "capped",
            "providers": {"arrangement": "unavailable", "music": "unavailable"},
        }

    def submit(self, raw_body: bytes, idempotency_key: str, job_key: str) -> JobView:
        if not _IDEMPOTENCY.fullmatch(idempotency_key) or not _CAPABILITY.fullmatch(job_key):
            raise JobError("invalid_request")
        if len(raw_body) > MAX_BODY_BYTES:
            raise JobError("payload_too_large")
        samples, gaps = _validated_trace(raw_body)
        trace = clean_trace(samples, gaps)
        if not trace.usable:
            code = "trace_unclear"
            if trace.code in {"trace_too_short", "trace_unclear"}:
                code = trace.code
            raise JobError(code)
        idempotency_hash = digest("idempotency", idempotency_key.encode())
        capability_hash = digest("capability", job_key.lower().encode())
        body_hash = digest("body", raw_body)
        created = False
        job_id = ""

        def reserve(data: dict[str, object]) -> None:
            nonlocal created, job_id
            existing = _find_idempotency(data, idempotency_hash)
            if existing is not None:
                if not _same(str(existing.get("body_hash")), body_hash):
                    raise JobError("conflicting_request")
                job_id = str(existing["job_id"])
                created = False
                return
            if _has_active(data):
                raise JobError("active_job")
            usage = _usage_bucket(data, day_key(self.now()))
            if not _fits(usage):
                raise JobError("generation_limit")
            usage["gemma_attempts"] += GEMMA_RESERVE_ATTEMPTS
            usage["gpu_seconds"] += GPU_RESERVE_SECONDS
            usage["eleven_attempts"] += ELEVEN_RESERVE_ATTEMPTS
            job_id = _new_job_id(data)
            now = self.now()
            jobs = data["jobs"]
            if not isinstance(jobs, dict):
                raise LedgerError
            jobs[job_id] = {
                "job_id": job_id,
                "capability_hash": capability_hash,
                "idempotency_hash": idempotency_hash,
                "body_hash": body_hash,
                "status": "dispatching",
                "stage": "reading_walk",
                "mode": None,
                "error": None,
                "provider_outcome": "dispatching",
                "created_at": stamp(now),
                "expires_at": stamp(now + RESULT_TTL),
            }
            created = True

        self._run(reserve)
        if not created:
            return self._recorded(self._view(job_id))
        prepare = getattr(self.dispatch, "prepare", None)
        discard = getattr(self.dispatch, "discard", None)
        try:
            if prepare is not None:
                prepare(job_id, trace)
            self.dispatch.start(job_id)
        except Exception:  # noqa: BLE001 - any provider failure is an unknown charged outcome
            self._settle(job_id, "unknown")
        else:
            self._settle(job_id, "reserved")
        finally:
            if discard is not None:
                discard(job_id)
        return self._recorded(self._view(job_id))

    def complete(self, job_id: str, outcome: object) -> None:
        from app.jobs.flow import WalkOutcome

        if not isinstance(outcome, WalkOutcome):
            raise TypeError("walk outcome is incomplete")
        if contains_location(outcome.result):
            raise RuntimeError("private result refused")
        audio = outcome.audio
        result = outcome.result
        root = self.artifacts / job_id
        root.mkdir(parents=True, exist_ok=True)
        handle = os.open(root / "audio", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(handle, "wb") as stored:
            stored.write(audio)

        def mark(data: dict[str, object]) -> None:
            job = _jobs(data).get(job_id)
            if not isinstance(job, dict) or job.get("status") != "dispatching":
                return
            job["status"] = "ready"
            job["stage"] = outcome.stage
            job["mode"] = outcome.mode
            job["error"] = None
            job["provider_outcome"] = job["mode"]
            job["result"] = result

        self._run(mark)

    def get(self, job_id: str, job_key: str) -> JobView:
        job = self._authorized(job_id, job_key)
        return self._recorded(JobView(job, self.now()))

    def delete(self, job_id: str, job_key: str | None) -> None:
        if not _JOB_ID.fullmatch(job_id):
            return
        job = self._load(job_id)
        if job is None:
            return
        if job_key is None or not _CAPABILITY.fullmatch(job_key):
            raise JobError("invalid_capability")
        if not _same(
            str(job.get("capability_hash")), digest("capability", job_key.lower().encode())
        ):
            raise JobError("invalid_capability")

        def mark(data: dict[str, object]) -> None:
            current = _jobs(data).get(job_id)
            if isinstance(current, dict):
                current["status"] = "deleted"

        self._run(mark)
        access_event(job_id=job_id, status="deleted")

    def audio_file(self, job_id: str, job_key: str) -> Path:
        self._authorized(job_id, job_key)
        root = (self.artifacts / job_id).resolve()
        audio = (root / "audio").resolve()
        if audio.parent != root or not audio.is_file():
            raise JobError("not_found")
        return audio

    def _accepting(self) -> bool:
        open_slot = True

        def look(data: dict[str, object]) -> None:
            nonlocal open_slot
            usage = _usage_bucket(data, day_key(self.now()))
            open_slot = not _has_active(data) and _fits(usage)

        self._run(look)
        return open_slot

    def _authorized(self, job_id: str, job_key: str) -> dict[str, object]:
        if not _JOB_ID.fullmatch(job_id):
            raise JobError("not_found")
        job = self._load(job_id)
        if job is None:
            raise JobError("not_found")
        if not _CAPABILITY.fullmatch(job_key):
            raise JobError("invalid_capability")
        presented = digest("capability", job_key.lower().encode())
        if not _same(str(job.get("capability_hash")), presented):
            raise JobError("invalid_capability")
        if job.get("status") == "deleted":
            raise JobError("not_found")
        if job.get("status") == "expired":
            raise JobError("expired")
        return job

    def _load(self, job_id: str) -> dict[str, object] | None:
        found: dict[str, object | None] = {"job": None}

        def read(data: dict[str, object]) -> None:
            job = _jobs(data).get(job_id)
            found["job"] = job if isinstance(job, dict) else None

        self._run(read)
        job = found["job"]
        return job if isinstance(job, dict) else None

    def _view(self, job_id: str) -> JobView:
        job = self._load(job_id)
        if job is None:
            raise JobError("not_found")
        if job.get("status") == "expired":
            raise JobError("expired")
        return JobView(job, self.now())

    def _settle(self, job_id: str, outcome: str) -> None:
        def mark(data: dict[str, object]) -> None:
            job = _jobs(data).get(job_id)
            if not isinstance(job, dict) or job.get("status") != "dispatching":
                return
            if outcome == "unknown":
                job["status"] = "interrupted"
                job["provider_outcome"] = "unknown"
                job["error"] = {
                    "code": "provider_unknown",
                    "message": "The piece could not be confirmed.",
                    "retryable": False,
                    "next_action": "Hear an example, or start another walk.",
                }
                return
            job["status"] = "reserved"
            job["provider_outcome"] = "reserved"

        self._run(mark)

    def _recorded(self, view: JobView) -> JobView:
        error_code = None
        if isinstance(view.error, dict) and isinstance(view.error.get("code"), str):
            error_code = view.error["code"]
        access_event(
            job_id=view.job_id,
            status=view.status,
            stage=view.stage,
            mode=view.mode,
            error_code=error_code,
            elapsed_ms=view.elapsed_ms,
        )
        return view

    def _run(self, mutate: Callable[[dict[str, object]], None]) -> None:
        live: set[str] | None = None

        def wrapped(data: dict[str, object]) -> None:
            nonlocal live
            mutate(data)
            live = _live_job_ids(data)

        try:
            self.ledger.transact(wrapped)
        except LedgerError as exc:
            raise JobError("processing_unavailable") from exc
        if live is not None:
            self._remove_private_artifacts(live)

    def _remove_private_artifacts(self, live: set[str]) -> None:
        if not self.artifacts.is_dir():
            return
        base = self.artifacts.resolve()
        for child in list(self.artifacts.iterdir()):
            if not _JOB_ID.fullmatch(child.name) or child.name in live:
                continue
            root = child.resolve()
            if not root.is_dir() or root.parent != base:
                continue
            audio = root / "audio"
            try:
                if os.path.lexists(audio):
                    audio.unlink()
                if not any(root.iterdir()):
                    root.rmdir()
            except OSError:
                continue


def _utcnow() -> datetime:
    return datetime.now(UTC)


class _GapIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start_ms: float = Field(allow_inf_nan=False)
    end_ms: float = Field(allow_inf_nan=False)


class _SampleIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    accuracy_m: float = Field(ge=0, allow_inf_nan=False)
    timestamp_ms: float = Field(allow_inf_nan=False)


class _Request(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["1"]
    mood: Literal["warm_cinematic"]
    consent_version: str = Field(pattern=r"^[A-Za-z0-9._-]{1,32}$")
    samples: list[_SampleIn] = Field(min_length=1, max_length=MAX_SAMPLES)
    interruptions: list[_GapIn] = Field(default_factory=list, max_length=64)


def _validated_trace(raw_body: bytes) -> tuple[list[RawSample], list[RawGap]]:
    try:
        loaded = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise JobError("invalid_request") from exc
    if not isinstance(loaded, dict):
        raise JobError("invalid_request")
    try:
        request = _Request.model_validate(loaded)
    except ValidationError as exc:
        raise JobError("invalid_request") from exc
    samples = [
        RawSample(item.latitude, item.longitude, item.accuracy_m, item.timestamp_ms)
        for item in request.samples
    ]
    gaps = [RawGap(item.start_ms, item.end_ms) for item in request.interruptions]
    return samples, gaps


def _find_idempotency(data: dict[str, object], idempotency_hash: str) -> dict[str, object] | None:
    for job in _jobs(data).values():
        if isinstance(job, dict) and job.get("idempotency_hash") == idempotency_hash:
            return job
    return None


def _has_active(data: dict[str, object]) -> bool:
    return any(
        isinstance(job, dict) and job.get("status") in ACTIVE for job in _jobs(data).values()
    )


def _live_job_ids(data: dict[str, object]) -> set[str]:
    live: set[str] = set()
    for job_id, job in _jobs(data).items():
        if isinstance(job, dict) and job.get("status") not in {"deleted", "expired"}:
            live.add(str(job_id))
    return live


def _jobs(data: dict[str, object]) -> dict[str, object]:
    jobs = data["jobs"]
    if not isinstance(jobs, dict):
        raise LedgerError
    return jobs


def _usage_bucket(data: dict[str, object], day: str) -> dict[str, int]:
    usage = data["usage"]
    if not isinstance(usage, dict):
        raise LedgerError
    bucket = usage.get(day)
    if not isinstance(bucket, dict):
        bucket = zero_usage()
        usage[day] = bucket
    for name in ("gemma_attempts", "gpu_seconds", "eleven_attempts"):
        if not isinstance(bucket.get(name), int):
            raise LedgerError
    return bucket


def _fits(usage: dict[str, int]) -> bool:
    return (
        usage["gemma_attempts"] + GEMMA_RESERVE_ATTEMPTS <= GEMMA_ATTEMPT_LIMIT
        and usage["gpu_seconds"] + GPU_RESERVE_SECONDS <= GPU_SECOND_LIMIT
        and usage["eleven_attempts"] + ELEVEN_RESERVE_ATTEMPTS <= ELEVEN_ATTEMPT_LIMIT
    )


def _new_job_id(data: dict[str, object]) -> str:
    jobs = _jobs(data)
    for _ in range(3):
        job_id = token_hex(16)
        if job_id not in jobs:
            return job_id
    raise LedgerError


def _same(stored: str, presented: str) -> bool:
    if len(stored) != len(presented):
        return False
    return hmac.compare_digest(stored, presented)
