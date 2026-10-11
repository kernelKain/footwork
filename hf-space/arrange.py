"""Anonymous timeline gate for the Gemma arrangement proof.

This module never invents a musical plan. A live arrangement is returned only
after a proved model call, which this build does not perform.
"""

from __future__ import annotations

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


def arrange(timeline: dict) -> dict:
    """Validate the anonymous timeline and return a blocked (never a live) arrangement result."""
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
    return _result(
        status="blocked",
        code="gemma_not_proved",
        message="No Gemma arrangement was generated. Route Sketch remains the fallback.",
    )


def _result(status: str, code: str, message: str) -> dict:
    """Build the standard proof-result payload for the given status/code/message."""
    return {
        "schema_version": "1",
        "status": status,
        "code": code,
        "model_id": MODEL_ID,
        "model_revision": MODEL_REVISION,
        "arrangement": None,
        "fallback": "route_sketch",
        "message": message,
    }


def _contains_forbidden(value: object) -> bool:
    """Return True if value contains any forbidden (location/clock) key."""
    if isinstance(value, dict):
        for key, nested in value.items():
            if str(key).lower() in FORBIDDEN_KEYS or _contains_forbidden(nested):
                return True
        return False
    if isinstance(value, list):
        return any(_contains_forbidden(item) for item in value)
    return False
