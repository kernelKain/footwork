"""Turn raw location samples into a privacy-safe trace.

Outputs use meters relative to the first accepted point and milliseconds
relative to that point. They do not include coordinates or wall-clock time.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from math import asin, cos, isfinite, radians, sin, sqrt

EARTH_M = 6_371_000.0
MAX_ACCURACY_M = 50.0
MAX_SPEED_M_S = 12.0
MIN_GAP_MS = 1_000.0
OPEN_GAP_MS = 15_000.0
MAX_DURATION_MS = 30 * 60 * 1000.0
MIN_ACTIVE_MS = 90_000.0
MIN_SAMPLES = 30
MIN_DISTANCE_M = 60.0

_USABLE = "This walk has enough clear movement to shape a piece."


@dataclass(frozen=True)
class RawSample:
    latitude: float
    longitude: float
    accuracy_m: float
    timestamp_ms: float


@dataclass(frozen=True)
class RawGap:
    start_ms: float
    end_ms: float


@dataclass(frozen=True)
class ProjectedSample:
    t_ms: int
    x_m: float
    y_m: float


@dataclass(frozen=True)
class CleanTrace:
    samples: tuple[ProjectedSample, ...]
    gaps_ms: tuple[tuple[int, int], ...]
    distance_m: float
    active_ms: int
    usable: bool
    code: str | None
    summary: str
    rejected: Mapping[str, int]

    def public_dict(self) -> dict[str, object]:
        return {
            "samples": [
                {"t_ms": sample.t_ms, "x_m": sample.x_m, "y_m": sample.y_m}
                for sample in self.samples
            ],
            "gaps_ms": [list(gap) for gap in self.gaps_ms],
            "distance_m": self.distance_m,
            "active_ms": self.active_ms,
            "usable": self.usable,
            "code": self.code,
            "summary": self.summary,
            "rejected": dict(self.rejected),
        }


def clean_trace(
    samples: list[RawSample],
    gaps: list[RawGap] | None = None,
) -> CleanTrace:
    recorded = [gap for gap in (gaps or []) if _valid_gap(gap)]
    rejected = {"invalid": 0, "inaccurate": 0, "too_soon": 0, "jump": 0, "duration": 0}
    accepted: list[RawSample] = []

    for sample in samples:
        if not _valid_sample(sample):
            rejected["invalid"] += 1
            continue
        if sample.accuracy_m > MAX_ACCURACY_M:
            rejected["inaccurate"] += 1
            continue
        previous = accepted[-1] if accepted else None
        if previous is not None and sample.timestamp_ms < previous.timestamp_ms:
            rejected["invalid"] += 1
            continue
        if previous is not None and sample.timestamp_ms - previous.timestamp_ms < MIN_GAP_MS:
            rejected["too_soon"] += 1
            continue
        if (
            previous is not None
            and sample.timestamp_ms - accepted[0].timestamp_ms > MAX_DURATION_MS
        ):
            rejected["duration"] += 1
            continue
        if previous is not None and _is_jump(previous, sample, recorded):
            rejected["jump"] += 1
            continue
        accepted.append(sample)

    if not accepted:
        summary, code = _explain(0, 0.0, 0, rejected)
        return CleanTrace((), (), 0.0, 0, False, code, summary, rejected)

    origin = accepted[0]
    projected: list[ProjectedSample] = []
    gap_bounds: list[tuple[int, int]] = []
    distance = 0.0
    active = 0.0
    for index, sample in enumerate(accepted):
        t_ms = round(sample.timestamp_ms - origin.timestamp_ms)
        x_m, y_m = _project(sample.latitude, sample.longitude, origin.latitude, origin.longitude)
        projected.append(ProjectedSample(t_ms, x_m, y_m))
        if index == 0:
            continue
        earlier = accepted[index - 1]
        separated = _separated(earlier, sample, recorded)
        if separated:
            gap_bounds.append(
                (
                    round(earlier.timestamp_ms - origin.timestamp_ms),
                    t_ms,
                )
            )
            continue
        distance += _haversine_m(
            earlier.latitude,
            earlier.longitude,
            sample.latitude,
            sample.longitude,
        )
        active += sample.timestamp_ms - earlier.timestamp_ms

    summary, code = _explain(active, distance, len(accepted), rejected)
    return CleanTrace(
        tuple(projected),
        tuple(gap_bounds),
        distance,
        round(active),
        code is None,
        code,
        summary,
        rejected,
    )


def _valid_sample(sample: RawSample) -> bool:
    return (
        _finite(sample.latitude)
        and -90.0 <= sample.latitude <= 90.0
        and _finite(sample.longitude)
        and -180.0 <= sample.longitude <= 180.0
        and _finite(sample.accuracy_m)
        and sample.accuracy_m >= 0.0
        and _finite(sample.timestamp_ms)
        and sample.timestamp_ms > 0.0
    )


def _valid_gap(gap: RawGap) -> bool:
    return _finite(gap.start_ms) and _finite(gap.end_ms) and gap.end_ms >= gap.start_ms


def _is_jump(previous: RawSample, sample: RawSample, gaps: list[RawGap]) -> bool:
    elapsed = sample.timestamp_ms - previous.timestamp_ms
    if elapsed > OPEN_GAP_MS or _overlaps_gap(previous.timestamp_ms, sample.timestamp_ms, gaps):
        return False
    moved = _haversine_m(previous.latitude, previous.longitude, sample.latitude, sample.longitude)
    return moved / (elapsed / 1000.0) > MAX_SPEED_M_S


def _separated(previous: RawSample, sample: RawSample, gaps: list[RawGap]) -> bool:
    elapsed = sample.timestamp_ms - previous.timestamp_ms
    return elapsed > OPEN_GAP_MS or _overlaps_gap(previous.timestamp_ms, sample.timestamp_ms, gaps)


def _overlaps_gap(start_ms: float, end_ms: float, gaps: list[RawGap]) -> bool:
    return any(gap.start_ms < end_ms and gap.end_ms > start_ms for gap in gaps)


def _project(
    latitude: float, longitude: float, origin_lat: float, origin_lon: float
) -> tuple[float, float]:
    x_m = radians(longitude - origin_lon) * cos(radians(origin_lat)) * EARTH_M
    y_m = radians(latitude - origin_lat) * EARTH_M
    return (x_m, y_m)


def _haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    phi1 = radians(lat1)
    phi2 = radians(lat2)
    delta_phi = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)
    chord = sin(delta_phi / 2.0) ** 2 + cos(phi1) * cos(phi2) * sin(delta_lon / 2.0) ** 2
    return 2.0 * EARTH_M * asin(min(1.0, sqrt(chord)))


def _explain(
    active_ms: float, distance_m: float, accepted: int, rejected: Mapping[str, int]
) -> tuple[str, str | None]:
    reasons: list[str] = []
    if active_ms < MIN_ACTIVE_MS:
        reasons.append("It was shorter than 90 seconds of clear movement.")
    if distance_m < MIN_DISTANCE_M:
        reasons.append("It did not cover 60 meters of accepted movement.")
    if accepted < MIN_SAMPLES:
        reasons.append("Fewer than 30 positions were clear enough to keep.")
    if not reasons:
        return (_USABLE, None)
    if any(rejected.values()):
        reasons.append("Unclear or impossible positions were left out.")
    code = (
        "trace_too_short"
        if active_ms < MIN_ACTIVE_MS or distance_m < MIN_DISTANCE_M
        else "trace_unclear"
    )
    return (" ".join(reasons), code)


def _finite(value: float) -> bool:
    return isfinite(value)
