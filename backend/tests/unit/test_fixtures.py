import json
from pathlib import Path

FIXTURES = Path(__file__).resolve().parents[3] / "fixtures"
FORBIDDEN_KEYS = {
    "latitude",
    "longitude",
    "lat",
    "lng",
    "coordinates",
    "raw_trace",
}


def test_synthetic_fixture_directory_exists() -> None:
    assert (FIXTURES / "synthetic").is_dir()


def test_json_fixtures_are_labeled_and_contain_no_locations() -> None:
    files = sorted(FIXTURES.rglob("*.json"))
    assert files, "at least one labeled JSON fixture is required"
    for path in files:
        payload = json.loads(path.read_text(encoding="utf-8"))
        assert payload.get("schema_version") == "1"
        assert payload.get("label") == "synthetic"
        assert FORBIDDEN_KEYS.isdisjoint(payload)
