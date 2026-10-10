from itertools import pairwise
from math import cos, hypot, radians, sin

from app.movement.clean import CleanTrace, ProjectedSample
from app.movement.detect import detect_events

STEP_MS = 3_000


def test_a_straight_walk_has_no_events() -> None:
    events = detect_events(_trace(_line(31, 1.5)))

    assert events == ()


def test_small_wobble_does_not_invent_a_turn() -> None:
    points = []
    for index in range(31):
        side = 1.2 if index % 2 else -1.2
        points.append((index * STEP_MS, 1.5 * index * 3.0, side))

    events = detect_events(_trace(points))

    assert [event.type for event in events] == []


def test_a_supported_corner_is_a_turn() -> None:
    events = detect_events(_trace(_corner(70.0)))

    assert [event.type for event in events] == ["turn"]
    assert events[0].magnitude == 70.0
    assert events[0].source_offset_ms == 42_000
    assert "70 degrees" in events[0].summary
    assert "latitude" not in events[0].public_dict()["summary"]


def test_a_shallow_bend_is_not_a_turn() -> None:
    events = detect_events(_trace(_corner(50.0)))

    assert events == ()


def test_a_short_kink_is_not_a_turn() -> None:
    points = _line(31, 1.5)
    kinked = []
    for index, (t_ms, x_m, y_m) in enumerate(points):
        kinked.append((t_ms, x_m, 8.0 if index == 15 else y_m))

    events = detect_events(_trace(kinked))

    assert [event.type for event in events] == []


def test_a_sustained_pace_change_is_detected() -> None:
    points = []
    x_m = 0.0
    previous = 0
    for index in range(31):
        t_ms = index * STEP_MS
        speed = 1.2 if previous < 42_000 else 1.8
        if index:
            x_m += speed * ((t_ms - previous) / 1000.0)
        points.append((t_ms, x_m, 0.0))
        previous = t_ms

    events = detect_events(_trace(points))

    assert [event.type for event in events] == ["pace_change"]
    assert events[0].source_offset_ms == 42_000
    assert events[0].magnitude == 0.5
    assert "rises by 50 percent" in events[0].summary


def test_a_brief_speed_blip_is_not_a_pace_change() -> None:
    points = []
    x_m = 0.0
    previous = 0
    for index in range(31):
        t_ms = index * STEP_MS
        speed = 3.0 if previous == 42_000 else 1.5
        if index:
            x_m += speed * ((t_ms - previous) / 1000.0)
        points.append((t_ms, x_m, 0.0))
        previous = t_ms

    assert detect_events(_trace(points)) == ()


def test_standing_still_is_a_pause_and_not_a_pace_change() -> None:
    points = _still_between(40_000, 52_000)

    events = detect_events(_trace(points))

    assert [event.type for event in events] == ["pause"]
    assert events[0].source_offset_ms == 42_000
    assert events[0].magnitude == 12.0
    assert "12 seconds" in events[0].summary


def test_a_short_hesitation_is_not_a_pause() -> None:
    points = _still_between(40_000, 44_000)

    assert detect_events(_trace(points)) == ()


def test_an_out_and_back_closes_a_loop() -> None:
    points = []
    for index in range(41):
        t_ms = index * 2_500
        if t_ms <= 50_000:
            y_m = 1.4 * (t_ms / 1000.0)
        else:
            y_m = 70.0 - 1.4 * ((t_ms - 50_000) / 1000.0)
        points.append((t_ms, 0.0, y_m))

    events = detect_events(_trace(points))
    kinds = [event.type for event in events]

    assert "loop" in kinds
    assert "pause" not in kinds
    assert "pace_change" not in kinds
    loop = next(event for event in events if event.type == "loop")
    assert loop.source_offset_ms >= 60_000
    assert loop.magnitude <= 20.0
    assert "latitude" not in str(loop.public_dict())


def test_a_gap_does_not_become_a_turn_or_a_pause() -> None:
    outbound = [(index * STEP_MS, 1.5 * index * 3.0, 0.0) for index in range(8)]
    restart = outbound[-1][0] + 20_000
    inbound = [
        (restart + index * STEP_MS, outbound[-1][1], 1.5 * index * 3.0) for index in range(28)
    ]

    events = detect_events(_trace([*outbound, *inbound], gaps=((outbound[-1][0], restart),)))

    assert events == ()


def test_an_unusable_trace_does_not_invent_events() -> None:
    events = detect_events(_trace(_corner(90.0), usable=False))

    assert events == ()


def _line(count: int, speed_m_s: float) -> list[tuple[int, float, float]]:
    return [(index * STEP_MS, speed_m_s * index * STEP_MS / 1000.0, 0.0) for index in range(count)]


def _corner(degrees: float) -> list[tuple[int, float, float]]:
    points: list[tuple[int, float, float]] = []
    for index in range(31):
        t_ms = index * STEP_MS
        if t_ms <= 42_000:
            points.append((t_ms, 1.5 * t_ms / 1000.0, 0.0))
            continue
        elapsed_s = (t_ms - 42_000) / 1000.0
        points.append(
            (
                t_ms,
                1.5 * 42.0 + 1.5 * elapsed_s * cos(radians(degrees)),
                1.5 * elapsed_s * sin(radians(degrees)),
            )
        )
    return points


def _still_between(start_ms: int, end_ms: int) -> list[tuple[int, float, float]]:
    points: list[tuple[int, float, float]] = []
    x_m = 0.0
    t_ms = 0
    while t_ms < start_ms:
        points.append((t_ms, x_m, 0.0))
        t_ms += STEP_MS
        x_m += 1.5 * STEP_MS / 1000.0
    held = x_m
    while t_ms <= end_ms:
        points.append((t_ms, held, 0.0))
        t_ms += STEP_MS
    while t_ms <= 93_000:
        points.append((t_ms, x_m, 0.0))
        t_ms += STEP_MS
        x_m += 1.5 * STEP_MS / 1000.0
    return points


def _trace(
    points: list[tuple[int, float, float]],
    gaps: tuple[tuple[int, int], ...] = (),
    usable: bool = True,
) -> CleanTrace:
    samples = tuple(ProjectedSample(t_ms, x_m, y_m) for t_ms, x_m, y_m in points)
    distance = 0.0
    active = 0
    for previous, sample in pairwise(samples):
        separated = sample.t_ms - previous.t_ms > 15_000 or any(
            gap[0] < sample.t_ms and gap[1] > previous.t_ms for gap in gaps
        )
        if separated:
            continue
        distance += hypot(sample.x_m - previous.x_m, sample.y_m - previous.y_m)
        active += sample.t_ms - previous.t_ms
    return CleanTrace(
        samples,
        gaps,
        distance,
        active,
        usable,
        None if usable else "trace_too_short",
        "This walk has enough clear movement to shape a piece." if usable else "Too short.",
        {},
    )
