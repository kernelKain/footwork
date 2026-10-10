"""Detect turns, pace changes, pauses, and loops on a cleaned trace.

Thresholds are the locked engineering defaults. Events stay inside continuous
stretches, so a gap is not turned into movement. An unusable trace yields no events.
"""

from collections.abc import Sequence
from dataclasses import dataclass, replace
from itertools import pairwise
from math import acos, atan2, hypot, pi, radians
from typing import Literal

from app.movement.clean import OPEN_GAP_MS, CleanTrace, ProjectedSample

TURN_DEGREES = 60.0
TURN_SUPPORT_M = 12.0
TURN_LEG_DEGREES = 35.0
PACE_FRACTION = 0.30
PACE_HOLD_MS = 10_000
MIN_MOVING_M_S = 0.5
PAUSE_MS = 10_000
SPIKE_MS = 2_000
SPIKE_M = 2.0
LOOP_RADIUS_M = 20.0
LOOP_MIN_MS = 60_000
LOOP_MIN_TRAVEL_M = 100.0

EventType = Literal["turn", "pace_change", "pause", "loop"]
_TYPE_ORDER = {"turn": 0, "pace_change": 1, "pause": 2, "loop": 3}


@dataclass(frozen=True)
class MovementEvent:
    id: str
    type: EventType
    source_offset_ms: int
    magnitude: float
    confidence: float
    summary: str

    def public_dict(self) -> dict[str, object]:
        """Return the event as a public-facing dict."""
        return {
            "id": self.id,
            "type": self.type,
            "source_offset_ms": self.source_offset_ms,
            "magnitude": self.magnitude,
            "confidence": self.confidence,
            "summary": self.summary,
        }


def detect_events(trace: CleanTrace) -> tuple[MovementEvent, ...]:
    """Detect turns, pace changes, pauses, and loops across the trace's continuous segments."""
    if not trace.usable or len(trace.samples) < 2:
        return ()
    samples = trace.samples
    gaps = trace.gaps_ms
    found: list[MovementEvent] = []
    for segment in _segments(samples, gaps):
        found.extend(_turns(segment))
        found.extend(_pace_changes(segment))
        found.extend(_pauses(segment))
    found.extend(_loops(samples, gaps))
    found.sort(key=lambda event: (event.source_offset_ms, _TYPE_ORDER[event.type]))
    counts: dict[str, int] = {}
    numbered: list[MovementEvent] = []
    for event in found:
        counts[event.type] = counts.get(event.type, 0) + 1
        numbered.append(replace(event, id=f"{event.type}-{counts[event.type]}"))
    return tuple(numbered)


def _segments(
    samples: Sequence[ProjectedSample], gaps: Sequence[tuple[int, int]]
) -> list[tuple[ProjectedSample, ...]]:
    """Split samples into continuous runs separated by gaps."""
    segments: list[list[ProjectedSample]] = [[samples[0]]]
    for previous, sample in pairwise(samples):
        if _separated(previous, sample, gaps):
            segments.append([sample])
        else:
            segments[-1].append(sample)
    return [tuple(segment) for segment in segments if segment]


def _turns(samples: Sequence[ProjectedSample]) -> list[MovementEvent]:
    """Find turn events where the heading changes sharply between straight legs."""
    candidates: list[tuple[int, float]] = []
    for index in range(1, len(samples) - 1):
        back = _support_index(samples, index, -1)
        forward = _support_index(samples, index, 1)
        if back is None or forward is None:
            continue
        if not _straight_leg(samples, back, index) or not _straight_leg(samples, index, forward):
            continue
        angle = _angle_degrees(
            samples[index].x_m - samples[back].x_m,
            samples[index].y_m - samples[back].y_m,
            samples[forward].x_m - samples[index].x_m,
            samples[forward].y_m - samples[index].y_m,
        )
        if angle >= TURN_DEGREES:
            candidates.append((index, angle))
    chosen: list[tuple[int, float]] = []
    for index, angle in candidates:
        if chosen and _path(samples, chosen[-1][0], index) < TURN_SUPPORT_M:
            if angle > chosen[-1][1]:
                chosen[-1] = (index, angle)
            continue
        chosen.append((index, angle))
    return [
        MovementEvent(
            id="turn",
            type="turn",
            source_offset_ms=samples[index].t_ms,
            magnitude=round(angle, 1),
            confidence=round(min(1.0, angle / 90.0), 2),
            summary=f"Heading changes by {round(angle)} degrees.",
        )
        for index, angle in chosen
    ]


def _pace_changes(samples: Sequence[ProjectedSample]) -> list[MovementEvent]:
    """Find points where the steady speed rises or falls by a significant fraction."""
    events: list[MovementEvent] = []
    next_t = samples[0].t_ms
    for sample in samples:
        if sample.t_ms < next_t:
            continue
        before = _steady_speed(samples, sample.t_ms - PACE_HOLD_MS, sample.t_ms)
        after = _steady_speed(samples, sample.t_ms, sample.t_ms + PACE_HOLD_MS)
        if before is None or after is None:
            continue
        if before < MIN_MOVING_M_S or after < MIN_MOVING_M_S:
            continue
        fraction = (after - before) / before
        if abs(fraction) < PACE_FRACTION:
            continue
        direction = "rises" if fraction > 0 else "falls"
        percent = round(abs(fraction) * 100)
        events.append(
            MovementEvent(
                id="pace_change",
                type="pace_change",
                source_offset_ms=sample.t_ms,
                magnitude=round(fraction, 2),
                confidence=round(min(1.0, abs(fraction) / 0.5), 2),
                summary=f"Pace {direction} by {percent} percent.",
            )
        )
        next_t = sample.t_ms + PACE_HOLD_MS
    return events


def _pauses(samples: Sequence[ProjectedSample]) -> list[MovementEvent]:
    """Find pause events where movement stays below the moving-speed threshold."""
    events: list[MovementEvent] = []
    start: ProjectedSample | None = None
    end = samples[0]
    for previous, sample in pairwise(samples):
        if _slow_interval(previous, sample):
            if start is None:
                start = previous
            end = sample
            continue
        if start is not None:
            events.extend(_pause_event(start, end))
            start = None
    if start is not None:
        events.extend(_pause_event(start, end))
    return events


def _pause_event(start: ProjectedSample, end: ProjectedSample) -> list[MovementEvent]:
    """Build a pause event if the slow interval lasted long enough."""
    duration_ms = end.t_ms - start.t_ms
    if duration_ms < PAUSE_MS:
        return []
    seconds = round(duration_ms / 1000)
    return [
        MovementEvent(
            id="pause",
            type="pause",
            source_offset_ms=start.t_ms,
            magnitude=float(seconds),
            confidence=round(min(1.0, duration_ms / 20_000), 2),
            summary=(f"Movement stays under 0.5 meters per second for {seconds} seconds."),
        )
    ]


def _loops(
    samples: Sequence[ProjectedSample], gaps: Sequence[tuple[int, int]]
) -> list[MovementEvent]:
    """Find loop events where the route returns near an earlier, distant stretch."""
    prefix = _prefix(samples, gaps)
    events: list[MovementEvent] = []
    skip_near: ProjectedSample | None = None
    for index, sample in enumerate(samples):
        if skip_near is not None and _distance(sample, skip_near) <= LOOP_RADIUS_M:
            continue
        skip_near = None
        match = _loop_match(samples, prefix, index)
        if match is None:
            continue
        travel_m, closest_m = match
        events.append(
            MovementEvent(
                id="loop",
                type="loop",
                source_offset_ms=sample.t_ms,
                magnitude=round(closest_m, 1),
                confidence=round(min(1.0, 0.5 + (LOOP_RADIUS_M - closest_m) / 40.0), 2),
                summary=(
                    "The route returns within 20 meters of an earlier stretch "
                    f"after {round(travel_m)} meters."
                ),
            )
        )
        skip_near = sample
    return events


def _loop_match(
    samples: Sequence[ProjectedSample], prefix: list[float], index: int
) -> tuple[float, float] | None:
    """Find an earlier sample close enough and far enough traveled to count as a loop."""
    here = samples[index]
    for earlier_index in range(index):
        earlier = samples[earlier_index]
        if here.t_ms - earlier.t_ms < LOOP_MIN_MS:
            continue
        travel = prefix[index] - prefix[earlier_index]
        if travel < LOOP_MIN_TRAVEL_M:
            continue
        closest = _distance(here, earlier)
        if closest > LOOP_RADIUS_M:
            continue
        if not _left_neighborhood(samples, earlier_index, index):
            continue
        return (travel, closest)
    return None


def _left_neighborhood(samples: Sequence[ProjectedSample], start: int, end: int) -> bool:
    """Return True when the path leaves the loop radius between start and end."""
    origin = samples[start]
    return any(_distance(samples[index], origin) > LOOP_RADIUS_M for index in range(start + 1, end))


def _support_index(samples: Sequence[ProjectedSample], index: int, step: int) -> int | None:
    """Walk from index until TURN_SUPPORT_M has been covered, or return None."""
    travelled = 0.0
    cursor = index
    while 0 <= cursor + step < len(samples):
        travelled += _distance(samples[cursor], samples[cursor + step])
        cursor += step
        if travelled >= TURN_SUPPORT_M:
            return cursor
    return None


def _straight_leg(samples: Sequence[ProjectedSample], start: int, end: int) -> bool:
    """Return True when the path between two samples is nearly a straight line."""
    left, right = sorted((start, end))
    path = _path(samples, left, right)
    chord = _distance(samples[left], samples[right])
    if chord <= 0.0 or path / chord > 1.2:
        return False
    heading = atan2(samples[right].y_m - samples[left].y_m, samples[right].x_m - samples[left].x_m)
    for index in range(left, right):
        step = atan2(
            samples[index + 1].y_m - samples[index].y_m,
            samples[index + 1].x_m - samples[index].x_m,
        )
        if abs(_wrap(step - heading)) > radians(TURN_LEG_DEGREES):
            return False
    return True


def _steady_speed(samples: Sequence[ProjectedSample], start_ms: int, end_ms: int) -> float | None:
    """Return the mean speed over a window if it stays steady, else None."""
    if end_ms - start_ms < PACE_HOLD_MS or start_ms < samples[0].t_ms or end_ms > samples[-1].t_ms:
        return None
    speeds: list[float] = []
    for previous, sample in pairwise(samples):
        overlap = min(sample.t_ms, end_ms) - max(previous.t_ms, start_ms)
        span = sample.t_ms - previous.t_ms
        if overlap <= 0 or span <= 0 or overlap < span * 0.5:
            continue
        speeds.append(_distance(previous, sample) / (span / 1000.0))
    if len(speeds) < 2:
        return None
    mean = sum(speeds) / len(speeds)
    scale = max(mean, MIN_MOVING_M_S)
    if any(abs(speed - mean) / scale > 0.15 for speed in speeds):
        return None
    return mean


def _slow_interval(previous: ProjectedSample, sample: ProjectedSample) -> bool:
    """Return True when the interval between two samples counts as moving too slowly."""
    elapsed = sample.t_ms - previous.t_ms
    if elapsed <= 0:
        return False
    moved = _distance(previous, sample)
    if elapsed <= SPIKE_MS and moved <= SPIKE_M:
        return True
    return moved / (elapsed / 1000.0) < MIN_MOVING_M_S


def _prefix(samples: Sequence[ProjectedSample], gaps: Sequence[tuple[int, int]]) -> list[float]:
    """Return cumulative distance traveled up to each sample, treating gaps as zero distance."""
    prefix = [0.0]
    for previous, sample in pairwise(samples):
        step = 0.0 if _separated(previous, sample, gaps) else _distance(previous, sample)
        prefix.append(prefix[-1] + step)
    return prefix


def _separated(
    previous: ProjectedSample, sample: ProjectedSample, gaps: Sequence[tuple[int, int]]
) -> bool:
    """Return True when two samples are split by an open gap or a recorded interruption."""
    if sample.t_ms - previous.t_ms > OPEN_GAP_MS:
        return True
    return any(gap[0] < sample.t_ms and gap[1] > previous.t_ms for gap in gaps)


def _path(samples: Sequence[ProjectedSample], start: int, end: int) -> float:
    """Return the summed distance along samples from start to end."""
    return sum(_distance(samples[index], samples[index + 1]) for index in range(start, end))


def _distance(left: ProjectedSample, right: ProjectedSample) -> float:
    """Return the planar distance in meters between two samples."""
    return hypot(right.x_m - left.x_m, right.y_m - left.y_m)


def _angle_degrees(ax: float, ay: float, bx: float, by: float) -> float:
    """Return the angle in degrees between two vectors."""
    denom = hypot(ax, ay) * hypot(bx, by)
    if denom == 0.0:
        return 0.0
    cosine = min(1.0, max(-1.0, (ax * bx + ay * by) / denom))
    return acos(cosine) * 180.0 / pi


def _wrap(delta: float) -> float:
    """Wrap an angle in radians to the range [-pi, pi]."""
    return (delta + pi) % (2.0 * pi) - pi
