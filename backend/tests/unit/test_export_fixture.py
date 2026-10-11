import json
from math import cos, radians

from app.movement.export_fixture import review_text, sanitized_fixture

ORIGIN_LAT = 12.9716
ORIGIN_LNG = 77.5946


def test_a_private_corner_becomes_a_fixture_without_coordinates() -> None:
    fixture = sanitized_fixture(_private_corner())
    encoded = json.dumps(fixture)

    assert fixture["label"] == "sanitized_real"
    assert fixture["manifest"]["verification"]["human_reviewed"] is False
    assert fixture["result"]["provenance"]["source_category"] == "sanitized_real"
    assert "turn" in {event["type"] for event in fixture["result"]["events"]}
    assert "latitude" not in encoded
    assert "longitude" not in encoded
    assert "12.9716" not in encoded
    assert "77.5946" not in encoded
    assert "Heard" in review_text(fixture)
    assert "|  |" in review_text(fixture)


def test_a_short_walk_is_refused() -> None:
    try:
        sanitized_fixture(
            {
                "samples": [
                    {
                        "latitude": ORIGIN_LAT,
                        "longitude": ORIGIN_LNG,
                        "accuracy_m": 5,
                        "timestamp_ms": 1_000,
                    }
                ]
            }
        )
    except RuntimeError as exc:
        assert "12.9716" not in str(exc)
    else:
        raise AssertionError("a one-sample walk was accepted")


def _private_corner() -> dict[str, object]:
    samples = []
    for index in range(40):
        timestamp = 1_700_000_000_000 + index * 3_000
        if index < 20:
            east, north = index * 4.5, 0.0
        else:
            east, north = 20 * 4.5, (index - 20) * 4.5
        samples.append(
            {
                "latitude": ORIGIN_LAT + north / 111_320,
                "longitude": ORIGIN_LNG + east / (111_320 * cos(radians(ORIGIN_LAT))),
                "accuracyM": 8,
                "timestampMs": timestamp,
            }
        )
    return {"samples": samples, "interruptions": []}
