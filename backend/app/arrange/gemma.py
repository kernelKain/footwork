"""Turn an anonymous event timeline into a validated arrangement.

A model reply is accepted only when it matches the shared plan. Schema-invalid
output may be sent back once, and only when budget and deadline still allow
that call. Transport failures are not repeated. The fallback is Route Sketch.
"""

import json
import os
import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Protocol

from app.jobs.service import GEMMA_ATTEMPT_LIMIT, GPU_RESERVE_SECONDS, GPU_SECOND_LIMIT

MODEL_ID = "google/gemma-4-E2B-it"
MODEL_REVISION = "3e22461f65e89153144f8adb70e3b8c2cc9845a7"
CLIENT_DEADLINE = timedelta(seconds=90)
DURATION_MS = 60_000
MAX_EVENTS = 32
MAX_MODEL_CHARS = 8_000

STYLES = frozenset(
    {
        "instrumental",
        "sparse",
        "warm",
        "cinematic",
        "rising",
        "falling",
        "held",
        "brighter",
        "quieter",
        "pulse",
    }
)
EVENT_TYPES = frozenset({"turn", "pace_change", "pause", "loop"})
_ID = re.compile(r"^[a-z0-9-]{3,64}$")
_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)
_SLUG = {"turn": "turn", "pace_change": "pace", "pause": "pause", "loop": "loop"}
_FORBIDDEN = {"latitude", "longitude", "lat", "lng", "coordinates", "timestamp", "raw_trace"}


class ArrangeClient(Protocol):
    def arrange(self, timeline: dict[str, object]) -> object:
        """Return the model object. Raise if the call's outcome is unknown."""


@dataclass(frozen=True)
class ArrangementOutcome:
    status: str
    arrangement: dict[str, object] | None
    fallback: str | None
    code: str | None
    reason: str
    model_id: str
    model_revision: str
    attempts: int
    extra_attempts: int

    def public_arrangement(self) -> dict[str, object] | None:
        """Return the arrangement safe for exposure to callers."""
        return self.arrangement


class SpaceArrangeClient:
    """Calls the named `/arrange` endpoint. It does not log the token."""

    def __init__(self, space_url: str, token: str | None = None) -> None:
        """Store the Space URL and optional auth token for later calls."""
        self.space_url = space_url
        self._token = token

    def __repr__(self) -> str:
        """Return a repr that omits the token."""
        return f"SpaceArrangeClient(space_url={self.space_url!r})"

    def arrange(self, timeline: dict[str, object]) -> object:
        """Call the Space's `/arrange` endpoint with the given timeline."""
        from gradio_client import Client

        client = Client(self.space_url, token=self._token)
        return client.predict(timeline, api_name="/arrange")


def client_from_env() -> SpaceArrangeClient:
    """Build a SpaceArrangeClient from the HF_SPACE_URL/HF_TOKEN environment."""
    space_url = os.environ.get("HF_SPACE_URL", "").strip()
    if not space_url:
        raise RuntimeError("HF_SPACE_URL is not configured")
    token = os.environ.get("HF_TOKEN", "").strip()
    return SpaceArrangeClient(space_url, token or None)


def anonymous_timeline(events: Sequence[object]) -> dict[str, object] | None:
    """Build a de-identified timeline payload from events, or None if invalid."""
    if _contains_forbidden(events):
        return None
    prepared: list[dict[str, object]] = []
    seen: set[str] = set()
    counts = {"turn": 0, "pace": 0, "pause": 0, "loop": 0}
    for event in events:
        item = _public_event(event, seen, counts)
        if item is None:
            return None
        prepared.append(item)
        if len(prepared) == MAX_EVENTS:
            break
    if not prepared:
        return None
    prepared.sort(key=lambda item: int(item["audio_offset_ms"]))
    return {"schema_version": "1", "duration_ms": DURATION_MS, "events": prepared}


def generate_arrangement(
    events: Sequence[object],
    client: ArrangeClient,
    *,
    attempts_used: int,
    gpu_seconds_used: int,
    now: Callable[[], datetime],
    deadline: datetime,
    reserve_repair: Callable[[], bool] | None = None,
) -> ArrangementOutcome:
    """Request an arrangement from the client, repairing once if the plan is invalid."""
    timeline = anonymous_timeline(events)
    if timeline is None:
        return _degraded("timeline_rejected", 0, 0)
    if not _window_open(now(), deadline):
        return _degraded("deadline", 0, 0)

    try:
        raw = client.arrange(timeline)
    except Exception:  # noqa: BLE001 - an unknown provider result is not repaired
        return _degraded("provider_failed", 1, 0)

    event_ids = {str(item["id"]) for item in _events(timeline)}
    plan, errors = parse_arrangement(raw, event_ids)
    if plan is not None:
        return _accepted(plan, 1, 0)
    if not _repair_allowed(attempts_used, gpu_seconds_used, now(), deadline):
        return _degraded("plan_invalid", 1, 0)
    if reserve_repair is not None and not reserve_repair():
        return _degraded("plan_invalid", 1, 0)

    repair = dict(timeline)
    repair["repair"] = {"errors": errors}
    try:
        repaired = client.arrange(repair)
    except Exception:  # noqa: BLE001 - the repair call was already reserved
        return _degraded("provider_failed", 2, 1)
    plan, _errors = parse_arrangement(repaired, event_ids)
    if plan is None:
        return _degraded("plan_invalid", 2, 1)
    return _accepted(plan, 2, 1)


def parse_arrangement(
    value: object, event_ids: set[str]
) -> tuple[dict[str, object] | None, list[str]]:
    """Parse and validate a raw model reply against the shared arrangement schema."""
    loaded = _coerce(value)
    if loaded is None:
        return None, ["json"]
    if not isinstance(loaded, dict):
        return None, ["shape"]
    errors: list[str] = []
    allowed = {"mood", "style", "event_refs"}
    if set(loaded) - allowed:
        errors.append("extra")
    if allowed - set(loaded):
        errors.append("shape")
    if loaded.get("mood") != "warm_cinematic":
        errors.append("mood")
    style = loaded.get("style")
    if not _valid_style(style):
        errors.append("style")
    refs = loaded.get("event_refs")
    if not _valid_refs(refs, event_ids):
        errors.append("event_refs")
    if errors:
        return None, errors
    assert isinstance(style, list)
    assert isinstance(refs, list)
    return {"mood": "warm_cinematic", "style": list(style), "event_refs": list(refs)}, []


def _accepted(plan: dict[str, object], attempts: int, extra: int) -> ArrangementOutcome:
    """Build a valid ArrangementOutcome for an accepted plan."""
    return ArrangementOutcome(
        status="valid",
        arrangement=plan,
        fallback=None,
        code=None,
        reason="validated",
        model_id=MODEL_ID,
        model_revision=MODEL_REVISION,
        attempts=attempts,
        extra_attempts=extra,
    )


def _degraded(reason: str, attempts: int, extra: int) -> ArrangementOutcome:
    """Build a degraded ArrangementOutcome that falls back to Route Sketch."""
    return ArrangementOutcome(
        status="degraded",
        arrangement=None,
        fallback="route_sketch",
        code="arrangement_unavailable",
        reason=reason,
        model_id=MODEL_ID,
        model_revision=MODEL_REVISION,
        attempts=attempts,
        extra_attempts=extra,
    )


def _repair_allowed(
    attempts_used: int, gpu_seconds_used: int, now: datetime, deadline: datetime
) -> bool:
    """Return True when attempt, GPU-second, and deadline budgets allow a repair call."""
    return (
        attempts_used + 1 <= GEMMA_ATTEMPT_LIMIT
        and gpu_seconds_used + GPU_RESERVE_SECONDS <= GPU_SECOND_LIMIT
        and _window_open(now, deadline)
    )


def _window_open(now: datetime, deadline: datetime) -> bool:
    """Return True when enough time remains before the deadline for another call."""
    return deadline - now >= CLIENT_DEADLINE


def _events(timeline: dict[str, object]) -> list[dict[str, object]]:
    """Return the timeline's event dicts, ignoring malformed entries."""
    events = timeline["events"]
    if not isinstance(events, list):
        return []
    return [item for item in events if isinstance(item, dict)]


def _public_event(
    event: object, seen: set[str], counts: dict[str, int]
) -> dict[str, object] | None:
    """Normalize one event to its public form, assigning a fallback id if needed."""
    raw_type = _field(event, "type")
    raw_offset = _field(event, "audio_offset_ms")
    if (
        raw_type not in EVENT_TYPES
        or isinstance(raw_offset, bool)
        or not isinstance(raw_offset, int)
    ):
        return None
    if not 0 <= raw_offset <= DURATION_MS:
        return None
    slug = _SLUG[str(raw_type)]
    raw_id = _field(event, "id")
    event_id = str(raw_id) if isinstance(raw_id, str) else ""
    if not _ID.fullmatch(event_id) or event_id in seen:
        counts[slug] += 1
        event_id = f"{slug}-{counts[slug]}"
    seen.add(event_id)
    return {"id": event_id, "type": raw_type, "audio_offset_ms": raw_offset}


def _field(event: object, name: str) -> object:
    """Read a field from an event, whether it's a mapping or an object."""
    if isinstance(event, Mapping):
        return event.get(name)
    return getattr(event, name, None)


def _valid_style(value: object) -> bool:
    """Return True when value is a valid, deduplicated style list including instrumental."""
    if not isinstance(value, list) or not 1 <= len(value) <= 6:
        return False
    if any(not isinstance(item, str) or item not in STYLES for item in value):
        return False
    return len(set(value)) == len(value) and "instrumental" in value


def _valid_refs(value: object, event_ids: set[str]) -> bool:
    """Return True when value is a deduplicated list of known event ids."""
    if not isinstance(value, list) or not 1 <= len(value) <= 64:
        return False
    if any(
        not isinstance(item, str) or not _ID.fullmatch(item) or item not in event_ids
        for item in value
    ):
        return False
    return len(set(value)) == len(value)


def _coerce(value: object) -> object | None:
    """Coerce a raw model reply (dict or fenced JSON string) into a Python object."""
    if isinstance(value, dict):
        return value
    if not isinstance(value, str) or len(value) > MAX_MODEL_CHARS:
        return None
    text = value.strip()
    fenced = _FENCE.search(text)
    if fenced is not None:
        text = fenced.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _contains_forbidden(value: object) -> bool:
    """Return True if value contains any forbidden (potentially identifying) key."""
    if isinstance(value, Mapping):
        return any(
            str(key).lower() in _FORBIDDEN or _contains_forbidden(nested)
            for key, nested in value.items()
        )
    if isinstance(value, list | tuple):
        return any(_contains_forbidden(item) for item in value)
    return False
