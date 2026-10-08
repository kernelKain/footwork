import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "hf-space"))

from arrange import MODEL_ID, arrange


def test_unproved_gemma_does_not_invent_an_arrangement() -> None:
    result = arrange(
        {
            "schema_version": "1",
            "events": [
                {"id": "turn-1", "type": "turn", "audio_offset_ms": 12000},
                {"id": "pause-1", "type": "pause", "audio_offset_ms": 30000},
            ],
        }
    )
    assert result["status"] == "blocked"
    assert result["code"] == "gemma_not_proved"
    assert result["arrangement"] is None
    assert result["model_id"] == MODEL_ID
    assert result["fallback"] == "route_sketch"
    assert "generated" in result["message"]


def test_location_fields_are_rejected_before_any_provider_call() -> None:
    result = arrange(
        {
            "schema_version": "1",
            "events": [{"id": "turn-1", "type": "turn", "latitude": 0, "longitude": 0}],
        }
    )
    assert result["status"] == "invalid"
    assert result["code"] == "location_rejected"
    assert result["arrangement"] is None


def test_arrange_response_is_json_safe() -> None:
    encoded = json.dumps(
        arrange({"schema_version": "1", "events": [{"id": "pause-1", "type": "pause"}]})
    )
    assert "sk-" not in encoded
    assert "hf_" not in encoded
