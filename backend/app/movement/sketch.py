"""Compress a cleaned walk into a 60-second Route Sketch.

The line falls until the first turn and rises after it. Each later turn flips
that direction. Every pause is silence. A pace change plays louder and adds a
brighter fifth. A loop replays the opening descending line. Display points are
translated, rotated, and scaled. They are not geographic coordinates.
"""

import array
import struct
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from math import atan2, cos, pi, sin

from app.movement.clean import CleanTrace, ProjectedSample
from app.movement.detect import MovementEvent

TARGET_MS = 60_000
MIN_CHAPTER_MS = 3_000
MAX_ANCHORS = 8
MIN_CHAPTERS = 3
PAUSE_HOLD_MS = 10_000
LOOP_HOLD_MS = 6_000
SAMPLE_RATE = 16_000
_HIGH_HZ = 523.0
_LOW_HZ = 330.0
_BASE_AMP = 0.35
_PACE_GAIN = 1.4
_MAX_AMP = 0.72
_FIFTH = 0.28
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
        """Return the sketch event as a JSON-serializable dict."""
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
        """Return the chapter as a JSON-serializable dict."""
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
        """Return the sync interval as a JSON-serializable dict."""
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
        """Return the route point as a JSON-serializable dict."""
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
        """Return the full route sketch as a JSON-serializable dict."""
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
    """Build the full 60-second Route Sketch (route, events, chapters, sync, audio)."""
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
    return RouteSketch(
        TARGET_MS,
        route,
        tuple(sketched),
        tuple(chapters),
        tuple(sync),
        _SUMMARY,
        _wav(_tone(sketched)),
    )


def melody_at(
    time_ms: float,
    events: Sequence[tuple[int, str]],
    duration_ms: int = TARGET_MS,
) -> tuple[float, float, float]:
    """Return Hz, amplitude, and fifth mix for one moment of the sketch.

    The first turn still turns a falling line upward. Each later turn flips that
    direction. Every pause is silence. A pace change raises the level and adds a
    brighter fifth. A loop replays the opening descending line.
    """
    ordered = sorted(events, key=lambda item: (item[0], _PRIORITY.get(item[1], 9)))
    for start_ms, end_ms in _silence_windows(ordered, duration_ms):
        if start_ms <= time_ms < end_ms:
            return (0.0, 0.0, 0.0)
    amplitude = _energy(time_ms, ordered)
    harmonic = _FIFTH if _pace_count(time_ms, ordered) else 0.0
    loop = _loop_window(time_ms, ordered, duration_ms)
    if loop is not None:
        start_ms, end_ms = loop
        span = max(end_ms - start_ms, 1)
        progress = 0.0 if end_ms <= start_ms else min((time_ms - start_ms) / span, 1.0)
        return (_HIGH_HZ - progress * (_HIGH_HZ - _LOW_HZ), amplitude, harmonic)
    return (_pitch(time_ms, ordered, duration_ms), amplitude, harmonic)


def frequency_hz(time_ms: float, turn_ms: int, pause_start_ms: int, pause_end_ms: int) -> float:
    """Return the melody frequency at time_ms: falling, then rising, silent during the pause."""
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
    """Return the mean absolute sample amplitude of the WAV over the given time window."""
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
    """Order events and map each to its 60-second audio offset."""
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
    """Pick up to MAX_ANCHORS well-spaced, prioritized events as chapter anchors."""
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
    """Return sorted chapter boundary times, splitting the largest gap until MIN_CHAPTERS."""
    bounds = sorted({0, *anchor_times, TARGET_MS})
    while len(bounds) - 1 < MIN_CHAPTERS:
        gaps = [bounds[index + 1] - bounds[index] for index in range(len(bounds) - 1)]
        index = max(range(len(gaps)), key=gaps.__getitem__)
        if gaps[index] < MIN_CHAPTER_MS * 2:
            break
        bounds.insert(index + 1, bounds[index] + gaps[index] // 2)
    return bounds


def _chapters(bounds: Sequence[int], anchors: Sequence[SketchEvent]) -> list[Chapter]:
    """Build titled chapters from the boundary times and their anchor events."""
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
    """Return the chapter title for its anchor event, or a default for the first chapter."""
    if anchor is None:
        return "Opening" if index == 0 else "Continue"
    return {"turn": "Turn", "pause": "Hold", "pace_change": "Pace", "loop": "Return"}[anchor.type]


def _sync(
    bounds: Sequence[int], anchors: Sequence[SketchEvent], t0: int, span: int
) -> list[SyncInterval]:
    """Build sync intervals mapping each chapter's source time range to its audio range."""
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
    """Build the display route: trimmed, centered, rotated, normalized, and time-mapped."""
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
    """Return sample positions re-centered on their mean."""
    count = len(samples)
    origin_x = sum(sample.x_m for sample in samples) / count
    origin_y = sum(sample.y_m for sample in samples) / count
    return [(sample.x_m - origin_x, sample.y_m - origin_y) for sample in samples]


def _rotate(points: Sequence[tuple[float, float]]) -> list[tuple[float, float]]:
    """Rotate points to align their principal axis, for display only."""
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
    """Scale and center points into the unit square, preserving aspect ratio."""
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


def _silence_windows(events: Sequence[tuple[int, str]], duration_ms: int) -> list[tuple[int, int]]:
    """Return every pause as a silent window, ending at the next event or after ten seconds."""
    windows: list[tuple[int, int]] = []
    for time_ms, kind in events:
        if kind != "pause":
            continue
        later = [mark for mark, _kind in events if mark > time_ms]
        end_ms = min(duration_ms, min(later) if later else time_ms + PAUSE_HOLD_MS)
        if end_ms > time_ms:
            windows.append((time_ms, end_ms))
    return windows


def _loop_window(
    time_ms: float, events: Sequence[tuple[int, str]], duration_ms: int
) -> tuple[int, int] | None:
    """Return the active loop window, which replays the opening line for up to six seconds."""
    started = [mark for mark, kind in events if kind == "loop" and mark <= time_ms]
    if not started:
        return None
    start_ms = started[-1]
    later = [mark for mark, _kind in events if mark > start_ms]
    end_ms = min(duration_ms, start_ms + LOOP_HOLD_MS)
    if later:
        end_ms = min(end_ms, min(later))
    if end_ms <= start_ms or time_ms >= end_ms:
        return None
    return (start_ms, end_ms)


def _pace_count(time_ms: float, events: Sequence[tuple[int, str]]) -> int:
    """Return how many pace changes have already occurred."""
    return sum(1 for mark, kind in events if kind == "pace_change" and mark <= time_ms)


def _energy(time_ms: float, events: Sequence[tuple[int, str]]) -> float:
    """Raise the sketch level once for each pace change, up to a safe peak."""
    return min(_MAX_AMP, _BASE_AMP * (_PACE_GAIN ** _pace_count(time_ms, events)))


def _pitch(time_ms: float, events: Sequence[tuple[int, str]], duration_ms: int) -> float:
    """Glide through the turns. The first turn uses the original falling-then-rising line."""
    turns = [mark for mark, kind in events if kind == "turn"]
    pauses = [mark for mark, kind in events if kind == "pause"]
    first_turn = turns[0] if turns else duration_ms
    first_pause = pauses[0] if pauses else duration_ms
    later_marks = [mark for mark, _kind in events if pauses and mark > pauses[0]]
    if not pauses:
        first_pause_end = duration_ms
    else:
        first_pause_end = min(
            duration_ms,
            min(later_marks) if later_marks else pauses[0] + PAUSE_HOLD_MS,
        )
        if first_pause_end <= pauses[0]:
            first_pause_end = duration_ms
    later_turns = [mark for mark in turns if mark > first_turn and mark <= time_ms]
    if not later_turns:
        return frequency_hz(time_ms, first_turn, first_pause, first_pause_end)
    start_ms = later_turns[-1]
    following = [mark for mark, _kind in events if mark > start_ms]
    end_ms = min(following) if following else duration_ms
    progress = min((time_ms - start_ms) / max(end_ms - start_ms, 1), 1.0)
    falling = (len(later_turns) - 1) % 2 == 0
    if falling:
        return _HIGH_HZ - progress * (_HIGH_HZ - _LOW_HZ)
    return _LOW_HZ + progress * (_HIGH_HZ - _LOW_HZ)


def _tone(events: Sequence[SketchEvent]) -> array.array:
    """Synthesize the 60-second mono PCM tone for the sketch melody."""
    marks = [(event.audio_offset_ms, event.type) for event in events]
    count = SAMPLE_RATE * TARGET_MS // 1000
    samples = array.array("h")
    phase = 0.0
    fifth = 0.0
    for index in range(count):
        time_ms = index * 1000.0 / SAMPLE_RATE
        hz, amplitude, harmonic = melody_at(time_ms, marks)
        if hz == 0.0 or amplitude == 0.0:
            sample = 0.0
        else:
            sample = sin(phase) * amplitude + sin(fifth) * amplitude * harmonic
            phase += 2.0 * pi * hz / SAMPLE_RATE
            fifth += 2.0 * pi * hz * 1.5 / SAMPLE_RATE
        samples.append(round(max(-1.0, min(1.0, sample)) * 32767))
    return samples


def _wav(samples: array.array) -> bytes:
    """Wrap the PCM samples in a WAV file header."""
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
    """Map a source timestamp to its position within the 60-second audio timeline."""
    return min(TARGET_MS, max(0, round((source_ms - t0) * TARGET_MS / span)))


def _source_at(audio_ms: int, t0: int, span: int) -> int:
    """Map an audio timeline offset back to its source timestamp."""
    return t0 + audio_ms * span // TARGET_MS


def _unit(value: float) -> float:
    """Clamp and round value to the [0, 1] range."""
    return min(1.0, max(0.0, round(value, 4)))
