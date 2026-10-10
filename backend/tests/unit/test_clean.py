from math import isfinite

from app.movement.clean import MAX_SPEED_M_S, CleanTrace, RawGap, RawSample, clean_trace

ORIGIN_LAT = 12.9716
ORIGIN_LON = 77.5946
T0 = 1_700_000_000_000.0


def test_noise_jumps_and_invalid_timestamps_are_left_out() -> None:
    samples = [
        _sample(0, 0.0),
        _sample(500, 1.0),
        RawSample(float("nan"), ORIGIN_LON, 5.0, T0 + 2_000),
        RawSample(91.0, ORIGIN_LON, 5.0, T0 + 3_000),
        RawSample(ORIGIN_LAT, ORIGIN_LON, -1.0, T0 + 4_000),
        RawSample(ORIGIN_LAT, ORIGIN_LON, 5.0, T0 - 1),
        _sample(5_000, 2.0, accuracy_m=80.0),
        _sample(6_000, 100.0),
        _sample(9_000, 3.0),
    ]

    trace = clean_trace(samples)

    assert trace.rejected["invalid"] == 4
    assert trace.rejected["too_soon"] == 1
    assert trace.rejected["inaccurate"] == 1
    assert trace.rejected["jump"] == 1
    assert [sample.t_ms for sample in trace.samples] == [0, 9_000]
    assert trace.samples[0].x_m == 0.0
    assert trace.samples[0].y_m == 0.0
    assert "12.9716" not in trace.summary
    assert "77.5946" not in trace.summary
    assert _has_coordinates(trace) is False


def test_a_long_gap_does_not_add_invented_movement() -> None:
    samples = [
        _sample(0, 0.0),
        _sample(3_000, 4.0),
        _sample(25_000, 500.0),
    ]

    trace = clean_trace(samples)

    assert trace.rejected["jump"] == 0
    assert len(trace.samples) == 3
    assert trace.gaps_ms == ((3_000, 25_000),)
    assert trace.distance_m == _between(0.0, 4.0)
    assert trace.distance_m < 10.0


def test_a_recorded_gap_does_not_connect_the_two_sides() -> None:
    samples = [_sample(0, 0.0), _sample(5_000, 40.0)]
    gaps = [RawGap(T0 + 1_000, T0 + 4_000)]

    trace = clean_trace(samples, gaps)

    assert trace.distance_m == 0.0
    assert trace.active_ms == 0
    assert trace.gaps_ms == ((0, 5_000),)


def test_a_short_unclear_walk_is_explained_without_coordinates() -> None:
    samples = [_sample(index * 3_000, index * 2.0) for index in range(5)]

    trace = clean_trace(samples)

    assert trace.usable is False
    assert trace.code == "trace_too_short"
    assert "90 seconds" in trace.summary
    assert "60 meters" in trace.summary
    assert "30 positions" in trace.summary
    assert "12.97" not in trace.summary
    assert trace.public_dict()["code"] == "trace_too_short"


def test_a_clear_walk_meets_the_floor_and_stays_relative() -> None:
    samples = [_sample(index * 3_000, index * 4.5) for index in range(31)]

    trace = clean_trace(samples)

    assert trace.usable is True
    assert trace.code is None
    assert trace.active_ms == 90_000
    assert len(trace.samples) == 31
    assert trace.distance_m >= 60.0
    assert trace.distance_m / 90.0 < MAX_SPEED_M_S
    assert "enough clear movement" in trace.summary
    assert _has_coordinates(trace) is False
    assert abs(trace.samples[-1].y_m - trace.distance_m) < 1.0


def test_samples_past_thirty_minutes_are_rejected() -> None:
    samples = [_sample(0, 0.0), _sample(31 * 60 * 1000, 10.0)]

    trace = clean_trace(samples)

    assert trace.rejected["duration"] == 1
    assert len(trace.samples) == 1


def _sample(offset_ms: float, north_m: float, accuracy_m: float = 8.0) -> RawSample:
    return RawSample(
        latitude=ORIGIN_LAT + (north_m / 6_371_000.0) * (180.0 / 3.141592653589793),
        longitude=ORIGIN_LON,
        accuracy_m=accuracy_m,
        timestamp_ms=T0 + offset_ms,
    )


def _between(start_m: float, end_m: float) -> float:
    trace = clean_trace([_sample(0, start_m), _sample(3_000, end_m)])
    return trace.distance_m


def _has_coordinates(trace: CleanTrace) -> bool:
    payload = str(trace.public_dict())
    return "latitude" in payload or "longitude" in payload or not isfinite(trace.distance_m)
