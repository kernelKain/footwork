import json
import sys
from pathlib import Path

SPACE = str(Path(__file__).resolve().parents[3] / "hf-space")
sys.path.insert(0, SPACE)
try:
    from gemma_runtime import prompt_timeline

    from arrange import MODEL_ID, arrange
finally:
    sys.path.remove(SPACE)


def _timeline() -> dict:
    return {
        "schema_version": "1",
        "events": [
            {"id": "turn-1", "type": "turn", "audio_offset_ms": 12000},
            {"id": "pause-1", "type": "pause", "audio_offset_ms": 30000},
        ],
    }


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


def test_a_matching_model_reply_is_a_validated_plan() -> None:
    def complete(timeline: dict) -> str:
        assert "latitude" not in json.dumps(timeline)
        ids = [event["id"] for event in timeline["events"]]
        return json.dumps(
            {
                "mood": "warm_cinematic",
                "style": ["instrumental", "warm"],
                "event_refs": ids,
            }
        )

    result = arrange(_timeline(), complete=complete)

    assert result["status"] == "valid"
    assert result["arrangement"]["mood"] == "warm_cinematic"
    assert result["arrangement"]["event_refs"] == ["turn-1", "pause-1"]
    assert result["fallback"] is None


def test_a_model_failure_does_not_invent_a_plan() -> None:
    def complete(_timeline: dict) -> str:
        raise RuntimeError("weights unavailable")

    result = arrange(_timeline(), complete=complete)

    assert result["status"] == "blocked"
    assert result["code"] == "gemma_unavailable"
    assert result["arrangement"] is None
    assert "RuntimeError" in result["message"]
    assert "weights unavailable" in result["message"]


def test_a_single_style_word_becomes_a_valid_plan() -> None:
    reply = """```json
{"mood":"warm_cinematic","style":"cinematic","event_refs":["turn-1"]}
```"""
    result = arrange(_timeline(), complete=lambda _timeline: reply)

    assert result["status"] == "valid"
    assert result["arrangement"]["style"] == ["instrumental", "cinematic"]
    assert result["arrangement"]["event_refs"] == ["turn-1"]


def test_a_bad_model_reply_is_not_treated_as_a_plan() -> None:
    result = arrange(_timeline(), complete=lambda _timeline: "hf_secretvalue walking")

    assert result["status"] == "invalid"
    assert result["code"] == "plan_invalid"
    assert result["arrangement"] is None
    assert "hf_" not in json.dumps(result)


def test_prompt_timeline_keeps_anonymous_fields_only() -> None:
    body = prompt_timeline(
        {
            "schema_version": "1",
            "duration_ms": 60_000,
            "events": [
                {
                    "id": "turn-1",
                    "type": "turn",
                    "audio_offset_ms": 12_000,
                    "latitude": 12.9,
                }
            ],
            "repair": {"errors": ["style"]},
        }
    )

    assert "latitude" not in json.dumps(body)
    assert body["events"] == [{"id": "turn-1", "type": "turn", "audio_offset_ms": 12_000}]
    assert body["repair"] == {"errors": ["style"]}


def test_arrange_response_is_json_safe() -> None:
    encoded = json.dumps(
        arrange({"schema_version": "1", "events": [{"id": "pause-1", "type": "pause"}]})
    )
    assert "sk-" not in encoded
    assert "hf_" not in encoded
