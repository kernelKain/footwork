"""Compress a cleaned walk into a 60-second Route Sketch.

The melody falls until the first turn, rises after it, and stays silent through
the pause. Display points are translated, rotated, and scaled. They are not
geographic coordinates.
"""

import array
import struct
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from math import atan2, cos, sin

from app.movement.clean import CleanTrace, ProjectedSample
from app.movement.detect import MovementEvent

TARGET_MS = 60_000
MIN_CHAPTER_MS = 3_000
MAX_ANCHORS = 8
MIN_CHAPTERS = 3
PAUSE_HOLD_MS = 10_000
SAMPLE_RATE = 16_000
TRIM_FRACTION = 0.02
_SUMMARY = (
    "This sketch follows the walk in order. The displayed route is rotated and scaled. "
    "Its shape can still be identifying."
)
_PRIORITY = {"turn": 0, "pause": 1, "pace_change": 2, "loop": 3}


@dataclass(frozen=True)
class SketchEvent:
    id: str
    type: str
    source_offset_ms: int
    audio_offset_ms: int
    confidence: float

    def public_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "type": self.type,
            "source_offset_ms": self.source_offset_ms,
            "audio_offset_ms": self.audio_offset_ms,
            "confidence": self.confidence,
        }


@dataclass(frozen=True)
class Chapter:
    id: str
    start_ms: int
    end_ms: int
    title: str

    def public_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "start_ms": self.start_ms,
            "end_ms": self.end_ms,
            "title": self.title,
        }


@dataclass(frozen=True)
class SyncInterval:
    id: str
    source_start_ms: int
    source_end_ms: int
    audio_start_ms: int
    audio_end_ms: int
    anchor_id: str | None

    def public_dict(self) -> dict[str, object]:
        return {
            "id": self.id,
            "source_start_ms": self.source_start_ms,
            "source_end_ms": self.source_end_ms,
            "audio_start_ms": self.audio_start_ms,
            "audio_end_ms": self.audio_end_ms,
            "anchor_id": self.anchor_id,
        }


@dataclass(frozen=True)
class RoutePoint:
    x: float
    y: float
    t_ms: int

    def public_dict(self) -> dict[str, object]:
        return {"x": self.x, "y": self.y, "t_ms": self.t_ms}


@dataclass(frozen=True)
class RouteSketch:
    duration_ms: int
    route: tuple[RoutePoint, ...]
    events: tuple[SketchEvent, ...]
    chapters: tuple[Chapter, ...]
    sync: tuple[SyncInterval, ...]
    summary: str
    wav: bytes

    def public_dict(self) -> dict[str, object]:
        return {
            "duration_ms": self.duration_ms,
            "route": [point.public_dict() for point in self.route],
            "events": [event.public_dict() for event in self.events],
            "chapters": [chapter.public_dict() for chapter in self.chapters],
            "sync": [interval.public_dict() for interval in self.sync],
            "audio_format": "audio/wav",
            "summary": self.summary,
        }


def compose_sketch(trace: CleanTrace, events: Sequence[MovementEvent]) -> RouteSketch:
    source = list(events) if trace.usable else []
    t0 = trace.samples[0].t_ms if trace.samples else 0
    t1 = trace.samples[-1].t_ms if trace.samples else 0
    span = max(t1 - t0, 1)
    sketched = _schedule(source, t0, span)
    anchors = _anchors(sketched)
    bounds = _chapter_bounds([event.audio_offset_ms for event in anchors])
    chapters = _chapters(bounds, anchors)
    sync = _sync(bounds, anchors, t0, span)
    route = _route(trace.samples, t0, t1, span)
    turn_ms = next((event.audio_offset_ms for event in sketched if event.type == "turn"), TARGET_MS)
    pause_start, pause_end = _pause_window(sketched)
    return RouteSketch(
        TARGET_MS,
        route,
        tuple(sketched),
        tuple(chapters),
        tuple(sync),
        _SUMMARY,
        _wav(_tone(turn_ms, pause_start, pause_end)),
    )


def frequency_hz(time_ms: float, turn_ms: int, pause_start_ms: int, pause_end_ms: int) -> float:
    if pause_start_ms <= time_ms < pause_end_ms:
        return 0.0
    if time_ms < turn_ms:
        progress = 1.0 if turn_ms == 0 else time_ms / turn_ms
        return 523.0 - progress * (523.0 - 330.0)
    if time_ms < pause_start_ms:
        progress = min((time_ms - turn_ms) / max(pause_start_ms - turn_ms, 1), 1.0)
        return 330.0 + progress * (523.0 - 330.0)
    return 392.0


def mean_abs_sample(wav: bytes, start_ms: int, end_ms: int) -> float:
    start = max(0, int(SAMPLE_RATE * start_ms / 1000))
    end = min(int(SAMPLE_RATE * end_ms / 1000), (len(wav) - 44) // 2)
    if end <= start:
        return 0.0
    samples = array.array("h")
    samples.frombytes(wav[44 + start * 2 : 44 + end * 2])
    if sys.byteorder != "little":
        samples.byteswap()
    return sum(abs(sample) for sample in samples) / (end - start)


def _schedule(events: Sequence[MovementEvent], t0: int, span: int) -> list[SketchEvent]:
    ordered = sorted(events, key=lambda event: (event.source_offset_ms, _PRIORITY[event.type]))
    return [
        SketchEvent(
            event.id,
            event.type,
            event.source_offset_ms,
            _audio_at(event.source_offset_ms, t0, span),
            event.confidence,
        )
        for event in ordered
    ]


def _anchors(events: Sequence[SketchEvent]) -> list[SketchEvent]:
    ranked = sorted(events, key=lambda event: (_PRIORITY[event.type], event.source_offset_ms))
    chosen: list[SketchEvent] = []
    for event in ranked:
        if len(chosen) >= MAX_ANCHORS:
            break
        if not MIN_CHAPTER_MS <= event.audio_offset_ms <= TARGET_MS - MIN_CHAPTER_MS:
            continue
        if any(
            abs(event.audio_offset_ms - kept.audio_offset_ms) < MIN_CHAPTER_MS for kept in chosen
        ):
            continue
        chosen.append(event)
    chosen.sort(key=lambda event: event.audio_offset_ms)
    return chosen


def _chapter_bounds(anchor_times: Sequence[int]) -> list[int]:
    bounds = sorted({0, *anchor_times, TARGET_MS})
    while len(bounds) - 1 < MIN_CHAPTERS:
        gaps = [bounds[index + 1] - bounds[index] for index in range(len(bounds) - 1)]
        index = max(range(len(gaps)), key=gaps.__getitem__)
        if gaps[index] < MIN_CHAPTER_MS * 2:
            break
        bounds.insert(index + 1, bounds[index] + gaps[index] // 2)
    return bounds


def _chapters(bounds: Sequence[int], anchors: Sequence[SketchEvent]) -> list[Chapter]:
    by_time = {anchor.audio_offset_ms: anchor for anchor in anchors}
    chapters: list[Chapter] = []
    for index in range(len(bounds) - 1):
        start = bounds[index]
        anchor = by_time.get(start)
        chapters.append(
            Chapter(f"chapter-{index + 1}", start, bounds[index + 1], _title(index, anchor))
        )
    return chapters


def _title(index: int, anchor: SketchEvent | None) -> str:
    if anchor is None:
        return "Opening" if index == 0 else "Continue"
    return {"turn": "Turn", "pause": "Hold", "pace_change": "Pace", "loop": "Return"}[anchor.type]


def _sync(
    bounds: Sequence[int], anchors: Sequence[SketchEvent], t0: int, span: int
) -> list[SyncInterval]:
    by_time = {anchor.audio_offset_ms: anchor.id for anchor in anchors}
    intervals: list[SyncInterval] = []
    for index in range(len(bounds) - 1):
        start = bounds[index]
        end = bounds[index + 1]
        intervals.append(
            SyncInterval(
                f"sync-{index + 1}",
                _source_at(start, t0, span),
                _source_at(end, t0, span),
                start,
                end,
                by_time.get(start),
            )
        )
    return intervals


def _route(
    samples: Sequence[ProjectedSample], t0: int, t1: int, span: int
) -> tuple[RoutePoint, ...]:
    trim = int(span * TRIM_FRACTION)
    kept = [sample for sample in samples if t0 + trim <= sample.t_ms <= t1 - trim]
    if len(kept) < 2:
        kept = list(samples)
    rotated = _normalize(_rotate(_center(kept)))
    points: list[RoutePoint] = []
    previous = -1
    for sample, (x_value, y_value) in zip(kept, rotated, strict=True):
        audio_ms = _audio_at(sample.t_ms, t0, span)
        if audio_ms <= previous:
            continue
        points.append(RoutePoint(_unit(x_value), _unit(y_value), audio_ms))
        previous = audio_ms
    return tuple(points)


def _center(samples: Sequence[ProjectedSample]) -> list[tuple[float, float]]:
    count = len(samples)
    origin_x = sum(sample.x_m for sample in samples) / count
    origin_y = sum(sample.y_m for sample in samples) / count
    return [(sample.x_m - origin_x, sample.y_m - origin_y) for sample in samples]


def _rotate(points: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    count = len(points)
    cxx = sum(x_value * x_value for x_value, _y_value in points) / count
    cyy = sum(y_value * y_value for _x_value, y_value in points) / count
    cxy = sum(x_value * y_value for x_value, y_value in points) / count
    angle = 0.5 * atan2(2.0 * cxy, cxx - cyy)
    turn = -angle
    return [
        (x_value * cos(turn) - y_value * sin(turn), x_value * sin(turn) + y_value * cos(turn))
        for x_value, y_value in points
    ]


def _normalize(points: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    span = max(max_x - min_x, max_y - min_y, 1e-6)
    pad_x = (span - (max_x - min_x)) / 2.0
    pad_y = (span - (max_y - min_y)) / 2.0
    return [
        ((x_value - min_x + pad_x) / span, (y_value - min_y + pad_y) / span)
        for x_value, y_value in points
    ]


def _pause_window(events: Sequence[SketchEvent]) -> tuple[int, int]:
    pause = next((event for event in events if event.type == "pause"), None)
    if pause is None:
        return (TARGET_MS, TARGET_MS)
    later = [
        event.audio_offset_ms for event in events if event.audio_offset_ms > pause.audio_offset_ms
    ]
    end_ms = min(TARGET_MS, min(later) if later else pause.audio_offset_ms + PAUSE_HOLD_MS)
    if end_ms <= pause.audio_offset_ms:
        return (TARGET_MS, TARGET_MS)
    return (pause.audio_offset_ms, end_ms)


def _tone(turn_ms: int, pause_start_ms: int, pause_end_ms: int) -> array.array:
    count = SAMPLE_RATE * TARGET_MS // 1000
    samples = array.array("h")
    phase = 0.0
    for index in range(count):
        time_ms = index * 1000.0 / SAMPLE_RATE
        hz = frequency_hz(time_ms, turn_ms, pause_start_ms, pause_end_ms)
        amplitude = 0.0 if hz == 0.0 else sin(phase) * 0.35
        phase += 2.0 * 3.141592653589793 * hz / SAMPLE_RATE
        samples.append(round(amplitude * 32767))
    return samples


def _wav(samples: array.array) -> bytes:
    if sys.byteorder != "little":
        samples.byteswap()
    data = samples.tobytes()
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + len(data),
        b"WAVE",
        b"fmt ",
        16,
        1,
        1,
        SAMPLE_RATE,
        SAMPLE_RATE * 2,
        2,
        16,
        b"data",
        len(data),
    )
    return header + data


def _audio_at(source_ms: int, t0: int, span: int) -> int:
    return min(TARGET_MS, max(0, round((source_ms - t0) * TARGET_MS / span)))


def _source_at(audio_ms: int, t0: int, span: int) -> int:
    return t0 + audio_ms * span // TARGET_MS


def _unit(value: float) -> float:
    return min(1.0, max(0.0, round(value, 4)))
