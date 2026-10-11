"""Atomic quota ledger.

The plan rejects a database. One exclusive file lock covers the read,
quota change, and idempotency record so two retries cannot both reserve.
"""

import fcntl
import hashlib
import json
import os
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import TypeVar

ACTIVE = {"reserved", "dispatching"}
RETAIN_FOR = timedelta(hours=48)
RESULT_TTL = timedelta(minutes=60)

_T = TypeVar("_T")


class LedgerError(Exception):
    """The ledger file cannot be trusted. The public response stays generic."""


class Ledger:
    def __init__(self, path: Path, now: Callable[[], datetime]) -> None:
        """Set up the ledger at the given path, using now() for timestamps."""
        self.path = path
        self._lock_path = path.with_suffix(".lock")
        self.now = now
        self._opened = False

    def transact(self, mutate: Callable[[dict[str, object]], _T]) -> _T:
        """Run mutate against the locked, loaded ledger data and persist the result."""
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock_path.open("a+") as handle:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            data = self._read()
            if not self._opened:
                _interrupt_active(data)
            _expire(data, self.now())
            result = mutate(data)
            self._write(data)
            self._opened = True
            return result

    def _read(self) -> dict[str, object]:
        """Load and validate the ledger file, or raise LedgerError if it's untrustworthy."""
        if not self.path.is_file():
            return {"schema_version": "1", "jobs": {}, "usage": {}}
        try:
            loaded = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise LedgerError from exc
        if (
            not isinstance(loaded, dict)
            or loaded.get("schema_version") != "1"
            or not isinstance(loaded.get("jobs"), dict)
            or not isinstance(loaded.get("usage"), dict)
        ):
            raise LedgerError
        return loaded

    def _write(self, data: dict[str, object]) -> None:
        """Atomically write the ledger data to disk with restrictive permissions."""
        temporary = self.path.with_suffix(".json.tmp")
        payload = json.dumps(data, sort_keys=True, separators=(",", ":")).encode()
        try:
            with temporary.open("wb") as handle:
                handle.write(payload)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temporary, self.path)
            os.chmod(self.path, 0o600)
        except OSError as exc:
            raise LedgerError from exc


def digest(label: str, value: bytes) -> str:
    """Return a SHA-256 hex digest of value, namespaced by label."""
    return hashlib.sha256(label.encode() + b"\0" + value).hexdigest()


def day_key(instant: datetime) -> str:
    """Return the UTC calendar-day key for the given instant."""
    return instant.astimezone(UTC).date().isoformat()


def stamp(instant: datetime) -> str:
    """Return the ISO-8601 UTC string for the given instant."""
    return instant.astimezone(UTC).isoformat()


def parse_stamp(value: str) -> datetime:
    """Parse an ISO-8601 timestamp, assuming UTC when no timezone is given."""
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed


def zero_usage() -> dict[str, int]:
    """Return a fresh zeroed usage counters dict."""
    return {"gemma_attempts": 0, "gpu_seconds": 0, "eleven_attempts": 0}


def _interrupt_active(data: dict[str, object]) -> None:
    """Mark any jobs left in an active state (e.g. after a crash) as interrupted."""
    jobs = data["jobs"]
    if not isinstance(jobs, dict):
        return
    for job in jobs.values():
        if isinstance(job, dict) and job.get("status") in ACTIVE:
            job["status"] = "interrupted"
            job["error"] = {
                "code": "interrupted",
                "message": "The piece was interrupted before it finished.",
                "retryable": False,
                "next_action": "Start another walk if you want a new piece.",
            }
            if job.get("provider_outcome") == "dispatching":
                job["provider_outcome"] = "unknown"


def _expire(data: dict[str, object], now: datetime) -> None:
    """Drop retained-too-long jobs/usage entries and mark expired jobs as expired."""
    jobs = data["jobs"]
    usage = data["usage"]
    if not isinstance(jobs, dict) or not isinstance(usage, dict):
        return
    cutoff = now - RETAIN_FOR
    for job_id, job in list(jobs.items()):
        if not isinstance(job, dict):
            del jobs[job_id]
            continue
        created = _safe_stamp(job.get("created_at"))
        if created is None or created <= cutoff:
            del jobs[job_id]
            continue
        expires = _safe_stamp(job.get("expires_at"))
        if job.get("status") != "deleted" and expires is not None and expires <= now:
            job["status"] = "expired"
    for day in list(usage):
        try:
            started = datetime.fromisoformat(str(day)).replace(tzinfo=UTC)
        except ValueError:
            continue
        if now - started > RETAIN_FOR:
            del usage[day]


def _safe_stamp(value: object) -> datetime | None:
    """Parse value as a timestamp, returning None if it isn't a valid string stamp."""
    if not isinstance(value, str):
        return None
    try:
        return parse_stamp(value)
    except ValueError:
        return None
