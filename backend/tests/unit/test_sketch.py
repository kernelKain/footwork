from app.movement.clean import CleanTrace, ProjectedSample
from app.movement.detect import MovementEvent
from app.movement.sketch import compose_sketch, frequency_hz, mean_abs_sample

TURN_SOURCE_MS = 27_000
PAUSE_SOURCE_MS = 54_000


def test_the_sketch_turns_the_melody_and_rests_at_the_pause() -> None:
    sketch = compose_sketch(
        _trace(),
        [_event("turn-1", "turn", TURN_SOURCE_MS), _event("pause-1", "pause", PAUSE_SOURCE_MS)],
    )

    turn = next(event for event in sketch.events if event.type == "turn")
    pause = next(event for event in sketch.events if event.type == "pause")
    assert abs(turn.audio_offset_ms - 18_000) <= 500
    assert abs(pause.audio_offset_ms - 36_000) <= 500
    assert frequency_hz(16_000, turn.audio_offset_ms, pause.audio_offset_ms, 46_000) > frequency_hz(
        17_000, turn.audio_offset_ms, pause.audio_offset_ms, 46_000
    )
    assert frequency_hz(20_000, turn.audio_offset_ms, pause.audio_offset_ms, 46_000) > frequency_hz(
        19_000, turn.audio_offset_ms, pause.audio_offset_ms, 46_000
    )
    assert {chapter.start_ms for chapter in sketch.chapters} >= {
        turn.audio_offset_ms,
        pause.audio_offset_ms,
    }

    pause_energy = mean_abs_sample(
        sketch.wav, pause.audio_offset_ms + 1_000, pause.audio_offset_ms + 9_000
    )
    moving_energy = mean_abs_sample(sketch.wav, 2_000, 8_000)
    assert pause_energy < 20
    assert moving_energy > 1000


def test_the_shared_map_stays_in_order() -> None:
    sketch = compose_sketch(
        _trace(),
        [_event("turn-1", "turn", TURN_SOURCE_MS), _event("pause-1", "pause", PAUSE_SOURCE_MS)],
    )

    assert sketch.sync[0].audio_start_ms == 0
    assert sketch.sync[-1].audio_end_ms == 60_000
    assert sketch.sync[0].source_start_ms == 0
    assert sketch.sync[-1].source_end_ms == 90_000
    for earlier, later in zip(sketch.sync, sketch.sync[1:], strict=False):
        assert earlier.audio_end_ms == later.audio_start_ms
        assert earlier.source_end_ms <= later.source_start_ms
        assert earlier.audio_end_ms - earlier.audio_start_ms >= 3_000
    assert 3 <= len(sketch.chapters) <= 10
    assert [event.id for event in sketch.events] == ["turn-1", "pause-1"]


def test_the_audio_is_a_one_minute_wav() -> None:
    sketch = compose_sketch(_trace(), [_event("turn-1", "turn", TURN_SOURCE_MS)])

    assert sketch.wav.startswith(b"RIFF")
    assert sketch.wav[8:12] == b"WAVE"
    assert sketch.duration_ms == 60_000
    sample_count = (len(sketch.wav) - 44) // 2
    assert abs(sample_count / 16_000 - 60.0) <= 0.5
    peak = mean_abs_sample(sketch.wav, 0, 60_000)
    assert peak > 1000
    assert "latitude" not in str(sketch.public_dict())
    assert "longitude" not in str(sketch.public_dict())


def test_display_routes_drop_geographic_orientation() -> None:
    east = compose_sketch(_trace(axis="east"), [])
    north = compose_sketch(_trace(axis="north"), [])

    for sketch in (east, north):
        xs = [point.x for point in sketch.route]
        ys = [point.y for point in sketch.route]
        assert max(xs) - min(xs) > 0.9
        assert max(ys) - min(ys) < 0.05
        assert min(xs) >= 0 and max(xs) <= 1
        assert min(ys) >= 0 and max(ys) <= 1
        assert sketch.route[0].t_ms < sketch.route[-1].t_ms
        assert sketch.route[0].t_ms > 0
    assert "identifying" in east.summary


def test_extra_events_stay_in_metadata_without_extra_chapters() -> None:
    events = [_event(f"pace-{index}", "pace_change", 9_000 + index * 8_000) for index in range(10)]

    sketch = compose_sketch(_trace(), events)

    assert len(sketch.events) == 10
    assert len(sketch.chapters) <= 10
    anchored = {chapter.start_ms for chapter in sketch.chapters}
    assert sum(event.audio_offset_ms in anchored for event in sketch.events) <= 8


def test_an_unusable_trace_does_not_invent_a_musical_turn() -> None:
    sketch = compose_sketch(
        _trace(usable=False),
        [_event("turn-1", "turn", TURN_SOURCE_MS), _event("pause-1", "pause", PAUSE_SOURCE_MS)],
    )

    assert sketch.events == ()
    assert mean_abs_sample(sketch.wav, 30_000, 40_000) > 1000


def _event(event_id: str, event_type: str, source_ms: int) -> MovementEvent:
    return MovementEvent(event_id, event_type, source_ms, 1.0, 0.9, "Fixture.")


def _trace(axis: str = "east", usable: bool = True) -> CleanTrace:
    samples = []
    for index in range(31):
        t_ms = index * 3_000
        distance = index * 4.5
        if axis == "north":
            samples.append(ProjectedSample(t_ms, 0.0, distance))
        else:
            samples.append(ProjectedSample(t_ms, distance, 0.0))
    return CleanTrace(
        tuple(samples),
        (),
        135.0,
        90_000,
        usable,
        None if usable else "trace_too_short",
        "Enough." if usable else "Too short.",
        {},
    )
