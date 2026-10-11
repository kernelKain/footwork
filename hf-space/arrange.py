"""Anonymous timeline gate for the Gemma arrangement.

A plan is returned only when a model reply matches the shared schema.
This module never invents a musical plan.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable

MODEL_ID = "google/gemma-4-E2B-it"
MODEL_REVISION = "3e22461f65e89153144f8adb70e3b8c2cc9845a7"

FORBIDDEN_KEYS = {
    "latitude",
    "longitude",
    "lat",
    "lng",
    "coordinates",
    "timestamp",
    "raw_trace",
}
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
_ID = re.compile(r"^[a-z0-9-]{3,64}$")
_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)
_SECRET = re.compile(r"\b(?:hf_|sk-)[A-Za-z0-9_\-]+")
Completer = Callable[[dict], str]


def arrange(timeline: dict, complete: Completer | None = None) -> dict:
    """Validate the timeline, then accept a model reply only when it matches the plan."""
    if _contains_forbidden(timeline):
        return _result(
            status="invalid",
            code="location_rejected",
            message="The timeline contains location or clock fields. No arrangement was requested.",
        )
    events = timeline.get("events")
    if timeline.get("schema_version") != "1" or not isinstance(events, list) or not events:
        return _result(
            status="invalid",
            code="timeline_invalid",
            message="An anonymized event timeline is required. No arrangement was generated.",
        )
    if complete is None:
        return _result(
            status="blocked",
            code="gemma_not_proved",
            message="No Gemma arrangement was generated. Route Sketch remains the fallback.",
        )
    try:
        raw = complete(timeline)
    except Exception as exc:
        return _result(
            status="blocked",
            code="gemma_unavailable",
            message=f"No Gemma arrangement was generated. {_failure_text(exc)}",
        )
    if not isinstance(raw, str):
        return _result(
            status="invalid",
            code="plan_invalid",
            message="The model reply was not text. No arrangement was invented.",
        )
    plan = _parse_plan(raw, _event_ids(events))
    if plan is None:
        return _result(
            status="invalid",
            code="plan_invalid",
            message="The model reply did not match the arrangement schema. No plan was invented.",
            model_text=_redact(raw),
        )
    return _result(
        status="valid",
        code="validated",
        message="A validated arrangement was generated.",
        arrangement=plan,
        fallback=None,
    )


def _parse_plan(raw: str, event_ids: set[str]) -> dict | None:
    """Return the three-key plan, or None when the reply does not match."""
    loaded = _coerce(raw)
    if not isinstance(loaded, dict):
        return None
    allowed = {"mood", "style", "event_refs"}
    if set(loaded) != allowed or loaded.get("mood") != "warm_cinematic":
        return None
    style = _normalize_style(loaded.get("style"))
    refs = _normalize_refs(loaded.get("event_refs"))
    if not _valid_style(style) or not _valid_refs(refs, event_ids):
        return None
    return {"mood": "warm_cinematic", "style": list(style), "event_refs": list(refs)}


def _event_ids(events: list) -> set[str]:
    """Collect event ids the model is allowed to cite."""
    found = set()
    for event in events:
        if isinstance(event, dict) and isinstance(event.get("id"), str):
            found.add(event["id"])
    return found


def _normalize_style(value: object) -> list[str] | None:
    """Turn one style word, or a list, into the closed vocabulary. Require instrumental."""
    if isinstance(value, str):
        parts = [item.strip() for item in re.split(r"[,/\s]+", value) if item.strip()]
    elif isinstance(value, list):
        parts = [item.strip() for item in value if isinstance(item, str)]
    else:
        return None
    kept: list[str] = []
    for item in parts:
        if item in STYLES and item not in kept:
            kept.append(item)
    if not kept:
        return None
    if "instrumental" not in kept:
        kept.insert(0, "instrumental")
    if len(kept) > 6:
        others = [item for item in kept if item != "instrumental"][:5]
        kept = ["instrumental", *others]
    return kept


def _normalize_refs(value: object) -> list[str] | None:
    """Accept one event id or a list of event ids."""
    if isinstance(value, str):
        return [value]
    if isinstance(value, list) and all(isinstance(item, str) for item in value):
        return list(value)
    return None


def _valid_style(value: object) -> bool:
    """Return True for one to six unique vocabulary words that include instrumental."""
    if not isinstance(value, list) or not 1 <= len(value) <= 6:
        return False
    if any(not isinstance(item, str) or item not in STYLES for item in value):
        return False
    return len(set(value)) == len(value) and "instrumental" in value


def _valid_refs(value: object, event_ids: set[str]) -> bool:
    """Return True when every reference is a known event id, once."""
    if not isinstance(value, list) or not value or len(value) > 64:
        return False
    if any(
        not isinstance(item, str) or not _ID.fullmatch(item) or item not in event_ids
        for item in value
    ):
        return False
    return len(set(value)) == len(value)


def _coerce(value: str) -> object | None:
    """Parse a raw reply, including one fenced JSON object."""
    text = value.strip()
    if len(text) > 8_000:
        return None
    fenced = _FENCE.search(text)
    if fenced is not None:
        text = fenced.group(1).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return None


def _redact(value: str) -> str:
    """Remove token-shaped strings before a rejected reply is returned."""
    return _SECRET.sub("[redacted]", value)[:8_000]


def _failure_text(exc: BaseException) -> str:
    """Return a short redacted reason for a failed model call."""
    return _redact(f"{type(exc).__name__}: {exc}")[:180]


def _result(
    status: str,
    code: str,
    message: str,
    arrangement: dict | None = None,
    fallback: str | None = "route_sketch",
    model_text: str | None = None,
) -> dict:
    """Build the proof-result payload."""
    body = {
        "schema_version": "1",
        "status": status,
        "code": code,
        "model_id": MODEL_ID,
        "model_revision": MODEL_REVISION,
        "arrangement": arrangement,
        "fallback": fallback,
        "message": message,
    }
    if model_text is not None:
        body["model_text"] = model_text
    return body


def _contains_forbidden(value: object) -> bool:
    """Return True if value contains any forbidden location or clock key."""
    if isinstance(value, dict):
        for key, nested in value.items():
            if str(key).lower() in FORBIDDEN_KEYS or _contains_forbidden(nested):
                return True
        return False
    if isinstance(value, list):
        return any(_contains_forbidden(item) for item in value)
    return False
