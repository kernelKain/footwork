"""Turn a cleaned walk into a Route Sketch or a Studio track.

The arrangement space is still unproved, so the installed dispatcher does not
call it. A validated plan is the only path that asks for music, and that call
is not repeated.
"""

import os
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from app.arrange.gemma import anonymous_timeline, generate_arrangement
from app.movement.clean import CleanTrace
from app.movement.detect import detect_events
from app.movement.sketch import RouteSketch, SketchEvent, compose_sketch
from app.music.render import MusicReceipt, inspect_mpeg, post_eleven, render_arrangement

_STORY = {
    "turn": "The path changes direction here.",
    "pause": "The walk holds still.",
    "pace_change": "The pace changes and stays there.",
    "loop": "The path comes back near where it started.",
}
_SKETCH_STYLE = ["instrumental", "sparse"]


@dataclass(frozen=True)
class WalkOutcome:
    mode: str
    stage: str
    stages: tuple[str, ...]
    result: dict[str, object]
    audio: bytes


class WalkDispatch:
    """Runs after the reservation. The trace stays in memory for this call only."""

    def __init__(
        self,
        arrange: Callable[[Sequence[Mapping[str, object]]], object],
        render: Callable[[Sequence[Mapping[str, object]], Sequence[str]], MusicReceipt],
        complete: Callable[[str, WalkOutcome], None] | None = None,
    ) -> None:
        self.arrange = arrange
        self.render = render
        self.complete = complete
        self._traces: dict[str, CleanTrace] = {}

    def prepare(self, job_id: str, trace: CleanTrace) -> None:
        self._traces[job_id] = trace

    def discard(self, job_id: str) -> None:
        self._traces.pop(job_id, None)

    def start(self, job_id: str) -> None:
        trace = self._traces.pop(job_id)
        outcome = finish_walk(job_id, trace, self.arrange, self.render)
        if self.complete is not None:
            self.complete(job_id, outcome)


def finish_walk(
    job_id: str,
    trace: CleanTrace,
    arrange: Callable[[Sequence[Mapping[str, object]]], object],
    render: Callable[[Sequence[Mapping[str, object]], Sequence[str]], MusicReceipt],
) -> WalkOutcome:
    stages = ["reading_walk", "finding_moments"]
    detected = detect_events(trace)
    sketch = compose_sketch(trace, detected)
    stages.append("shaping_music")
    public_events = _public_events(sketch.events)
    arrangement = arrange(public_events)
    plan = _plan(arrangement, public_events)
    audio = sketch.wav
    audio_format = "audio/wav"
    mode = "route_sketch"
    model_identity = None
    warnings: list[str] = []
    if plan is not None and _accepted(arrangement):
        stages.append("recording_piece")
        styles = plan["style"]
        assert isinstance(styles, list)
        receipt = render(public_events, [str(item) for item in styles])
        if receipt.status == "rendered" and receipt.audio:
            mode = "studio_live"
            audio = receipt.audio
            audio_format = "audio/mpeg"
            model_identity = receipt.model_id
        else:
            warnings.append("The studio recording is unavailable. This is the simpler version.")
    elif not _accepted(arrangement):
        warnings.append("The music plan is unavailable. This is the simpler version.")
    result = _result(
        job_id,
        mode,
        model_identity,
        sketch,
        public_events,
        plan or _sketch_plan(public_events),
        trace,
        warnings,
        audio_format,
    )
    return WalkOutcome(mode, stages[-1], tuple(stages), result, audio)


def blocked_arrangement(
    events: Sequence[Mapping[str, object]],
) -> object:
    return generate_arrangement(
        events,
        _BlockedSpace(),
        attempts_used=1,
        gpu_seconds_used=60,
        now=lambda: datetime.now(UTC),
        deadline=datetime.now(UTC) + timedelta(seconds=180),
    )


def render_with_key(
    events: Sequence[Mapping[str, object]],
    styles: Sequence[str],
) -> MusicReceipt:
    key = _music_key()

    def post(body: dict[str, object]) -> object:
        return post_eleven(body, key)

    return render_arrangement(events, styles, post, inspect_mpeg)


def live_dispatch() -> WalkDispatch:
    return WalkDispatch(blocked_arrangement, render_with_key)


class _BlockedSpace:
    def arrange(self, timeline: dict[str, object]) -> object:
        raise RuntimeError("arrangement space is not proved")


def _accepted(arrangement: object) -> bool:
    return getattr(arrangement, "status", None) == "valid"


def _plan(arrangement: object, events: Sequence[Mapping[str, object]]) -> dict[str, object] | None:
    plan = getattr(arrangement, "arrangement", None)
    if not isinstance(plan, dict):
        return None
    known = {str(event["id"]) for event in events}
    refs = plan.get("event_refs")
    if not isinstance(refs, list) or any(ref not in known for ref in refs):
        return None
    return plan


def _sketch_plan(events: Sequence[Mapping[str, object]]) -> dict[str, object]:
    return {
        "mood": "warm_cinematic",
        "style": list(_SKETCH_STYLE),
        "event_refs": [str(event["id"]) for event in events[:8]],
    }


def _public_events(events: Sequence[SketchEvent]) -> list[dict[str, object]]:
    raw = [
        {"id": event.id, "type": event.type, "audio_offset_ms": event.audio_offset_ms}
        for event in events
    ]
    timeline = anonymous_timeline(raw)
    if timeline is None:
        return []
    listed = timeline["events"]
    if not isinstance(listed, list):
        return []
    public: list[dict[str, object]] = []
    used: set[int] = set()
    for item in listed:
        if not isinstance(item, dict):
            continue
        match = _match(events, used, str(item.get("type")), item.get("audio_offset_ms"))
        if match is None:
            continue
        public.append(
            {
                "id": item["id"],
                "type": item["type"],
                "source_offset_ms": match.source_offset_ms,
                "audio_offset_ms": item["audio_offset_ms"],
                "confidence": match.confidence,
            }
        )
    return public


def _match(
    events: Sequence[SketchEvent], used: set[int], kind: str, audio_offset: object
) -> SketchEvent | None:
    for index, event in enumerate(events):
        if index in used:
            continue
        if event.type == kind and event.audio_offset_ms == audio_offset:
            used.add(index)
            return event
    return None


def _result(
    job_id: str,
    mode: str,
    model_identity: str | None,
    sketch: RouteSketch,
    events: Sequence[Mapping[str, object]],
    arrangement: Mapping[str, object],
    trace: CleanTrace,
    warnings: Sequence[str],
    audio_format: str,
) -> dict[str, object]:
    route = [{"x": point.x, "y": point.y, "t_ms": point.t_ms} for point in sketch.route]
    summary = _movement(trace, events, route)
    route = _route_inside(route, summary)
    return {
        "schema_version": "1",
        "job_id": job_id,
        "mode": mode,
        "provenance": {
            "source_category": "live",
            "generation_mode": mode,
            "model_identity": model_identity,
            "rights_note": _rights(mode),
            "mapping_status": "automated_sketch_verified",
        },
        "duration_ms": 60_000,
        "audio_available": True,
        "audio_format": audio_format,
        "route": {"points": route},
        "events": list(events),
        "chapters": [chapter.public_dict() for chapter in sketch.chapters],
        "arrangement": {
            "mood": "warm_cinematic",
            "style": list(arrangement["style"]),
            "event_refs": list(arrangement["event_refs"]),
        },
        "story": {
            "cards": [
                {
                    "id": f"card-{index + 1}",
                    "event_id": str(event["id"]),
                    "text": _STORY.get(str(event["type"]), "The walk continues."),
                }
                for index, event in enumerate(events[:12])
            ]
        },
        "movement_summary": summary,
        "quality": {"usable": True, "summary": _safe_summary(trace.summary)},
        "warnings": list(warnings),
        "mapping_verification": [
            {
                "event_id": str(event["id"]),
                "status": "automated_sketch_verified",
                "note": "Checked against the sketch clock.",
            }
            for event in events
        ],
    }


def _movement(
    trace: CleanTrace,
    events: Sequence[Mapping[str, object]],
    route: Sequence[Mapping[str, object]],
) -> dict[str, object]:
    end = trace.samples[-1].t_ms if trace.samples else 60_000
    end = max(end, _max_time(events, route), 1)
    segments, gaps = _intervals(end, trace.gaps_ms)
    active = sum(stop - start for start, stop in segments)
    elapsed = end
    amounts = _distances(segments, trace.distance_m)
    counts = {kind: 0 for kind in ("turn", "pause", "pace_change", "loop")}
    for event in events:
        kind = str(event["type"])
        if kind in counts:
            counts[kind] += 1
    grade = "mixed" if gaps else "clear"
    speed = None if active == 0 else trace.distance_m / (active / 1000)
    if grade == "limited":
        speed = None
    pace_at = segments[0][0] + max((segments[0][1] - segments[0][0]) // 2, 1)
    if pace_at >= segments[0][1]:
        pace_at = segments[0][0]
    return {
        "active_duration_ms": active,
        "elapsed_duration_ms": elapsed,
        "manual_break_duration_ms": 0,
        "distance_m": trace.distance_m,
        "average_moving_speed_mps": speed,
        "pace_series": [{"t_ms": pace_at, "pace": 0.5, "quality": "clear"}],
        "recording_segments": [
            {
                "id": f"segment-{index + 1}",
                "start_ms": start,
                "end_ms": stop,
                "distance_m": amounts[index],
            }
            for index, (start, stop) in enumerate(segments)
        ],
        "break_intervals": [],
        "uncertain_intervals": [
            {"id": f"uncertain-{index + 1}", "start_ms": start, "end_ms": stop, "reason": "signal"}
            for index, (start, stop) in enumerate(gaps)
        ],
        "event_counts": counts,
        "quality_grade": grade,
    }


def _intervals(
    end: int, gaps: Sequence[tuple[int, int]]
) -> tuple[list[tuple[int, int]], list[tuple[int, int]]]:
    cursor = 0
    segments: list[tuple[int, int]] = []
    uncertain: list[tuple[int, int]] = []
    for start, stop in gaps:
        start = max(0, min(start, end))
        stop = max(start, min(stop, end))
        if start > cursor:
            segments.append((cursor, start))
        if stop > start:
            uncertain.append((start, stop))
        cursor = max(cursor, stop)
    if cursor < end:
        segments.append((cursor, end))
    if not segments:
        segments.append((0, end))
    return segments, uncertain


def _distances(segments: Sequence[tuple[int, int]], total: float) -> list[float]:
    span = sum(stop - start for start, stop in segments) or 1
    amounts: list[float] = []
    used = 0.0
    for index, (start, stop) in enumerate(segments):
        if index == len(segments) - 1:
            amounts.append(total - used)
            continue
        share = total * (stop - start) / span
        amounts.append(share)
        used += share
    return amounts


def _route_inside(
    route: Sequence[Mapping[str, object]], summary: Mapping[str, object]
) -> list[dict[str, object]]:
    gaps = _spans(summary.get("uncertain_intervals"))
    kept: list[dict[str, object]] = []
    groups: list[list[dict[str, object]]] = [[]]
    for point in route:
        current = {"x": point["x"], "y": point["y"], "t_ms": point["t_ms"]}
        if not _inside(int(current["t_ms"]), summary, gaps):
            continue
        previous = groups[-1][-1]["t_ms"] if groups[-1] else None
        if isinstance(previous, int) and _crosses(previous, int(current["t_ms"]), gaps):
            groups.append([current])
            continue
        groups[-1].append(current)
    kept = max(groups, key=len)
    if len(kept) >= 2:
        return kept
    return [
        {"x": 0.0, "y": 0.5, "t_ms": 0},
        {"x": 1.0, "y": 0.5, "t_ms": 60_000},
    ]


def _spans(value: object) -> list[tuple[int, int]]:
    if not isinstance(value, list):
        return []
    spans: list[tuple[int, int]] = []
    for item in value:
        if isinstance(item, dict):
            spans.append((int(item["start_ms"]), int(item["end_ms"])))
    return spans


def _inside(time_ms: int, summary: Mapping[str, object], gaps: Sequence[tuple[int, int]]) -> bool:
    segments = _spans(summary.get("recording_segments"))
    covered = any(start <= time_ms <= stop for start, stop in segments)
    blocked = any(start < time_ms < stop for start, stop in gaps)
    return covered and not blocked


def _crosses(left: int, right: int, gaps: Sequence[tuple[int, int]]) -> bool:
    return any(left < stop and start < right for start, stop in gaps)


def _max_time(events: Sequence[Mapping[str, object]], route: Sequence[Mapping[str, object]]) -> int:
    times = [int(event["source_offset_ms"]) for event in events]
    times.extend(int(point["t_ms"]) for point in route)
    return max(times, default=0)


def _rights(mode: str) -> str:
    if mode == "studio_live":
        return (
            "Eleven Music rendered this track from the walk. It is not separately licensed as MIT."
        )
    return "This simpler version was made from the walk on this server. A studio did not record it."


def _safe_summary(summary: str) -> str:
    text = " ".join(summary.split())
    if any(word in text.lower() for word in ("latitude", "longitude")):
        return "This walk has enough clear movement to shape a piece."
    return text[:280]


def _music_key() -> str:
    for line in _env_lines():
        if line.startswith("ELEVENLABS_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("ELEVENLABS_API_KEY", "")


def _env_lines() -> list[str]:
    path = os.environ.get("FOOTWORK_ENV_FILE", "")
    if not path:
        candidate = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        path = os.path.abspath(candidate)
    if not os.path.isfile(path):
        return []
    with open(path, encoding="utf-8") as handle:
        return handle.read().splitlines()
