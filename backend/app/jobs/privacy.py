"""Privacy checks for stored results and job logs.

Log lines are built from an allowlist before they reach the logger. A filter
on the logger drops anything that still looks like a location or a credential,
so a later call cannot hand the raw request to a handler.
"""

import json
import logging
import re

LOG = logging.getLogger("footwork.jobs")

_TOKEN = re.compile(r"[a-z0-9_-]{1,32}")
_FIELDS = ("job_id", "status", "stage", "mode", "error_code")
_FORBIDDEN_KEYS = frozenset(
    {
        "latitude",
        "longitude",
        "lat",
        "lng",
        "coordinates",
        "timestamp",
        "timestamp_ms",
        "raw_trace",
        "samples",
        "authorization",
        "idempotency",
    }
)
_FORBIDDEN_WORDS = ("latitude", "longitude", "authorization", "bearer ", "sk-")


class _DropSensitive(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        lowered = record.getMessage().lower()
        return all(word not in lowered for word in _FORBIDDEN_WORDS)


def _install_filter() -> None:
    if any(isinstance(item, _DropSensitive) for item in LOG.filters):
        return
    LOG.addFilter(_DropSensitive())


_install_filter()


def access_event(*, elapsed_ms: int | None = None, **fields: object) -> None:
    safe: dict[str, object] = {}
    for key in _FIELDS:
        value = fields.get(key)
        if isinstance(value, str) and _TOKEN.fullmatch(value):
            safe[key] = value
    if (
        isinstance(elapsed_ms, int)
        and not isinstance(elapsed_ms, bool)
        and 0 <= elapsed_ms <= 86_400_000
    ):
        safe["elapsed_ms"] = elapsed_ms
    if not safe:
        return
    LOG.info("%s", json.dumps(safe, sort_keys=True))


def contains_location(value: object) -> bool:
    if isinstance(value, dict):
        return any(
            str(key).lower() in _FORBIDDEN_KEYS or contains_location(nested)
            for key, nested in value.items()
        )
    if isinstance(value, list | tuple):
        return any(contains_location(item) for item in value)
    if isinstance(value, str):
        lowered = value.lower()
        return "latitude" in lowered or "longitude" in lowered
    return False
