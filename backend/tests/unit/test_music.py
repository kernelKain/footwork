import json
import re

from app.music.render import (
    MODEL_ID,
    HttpResult,
    compile_chunks,
    render_arrangement,
    request_body,
)

EVENTS = (
    {"id": "turn-corner", "type": "turn", "audio_offset_ms": 12_000, "latitude": 12.97},
    {"id": "pause-hold", "type": "pause", "audio_offset_ms": 30_000, "longitude": 77.59},
)
STYLES = ("instrumental", "warm", "cinematic")


class FakePost:
    def __init__(self, result: HttpResult) -> None:
        self.result = result
        self.bodies: list[dict[str, object]] = []

    def __call__(self, body: dict[str, object]) -> HttpResult:
        self.bodies.append(body)
        return self.result


def test_chunks_follow_the_turn_and_the_pause() -> None:
    chunks = compile_chunks(EVENTS, STYLES)
    durations = [chunk["duration_ms"] for chunk in chunks]

    assert durations == [12_000, 18_000, 10_000, 20_000]
    assert sum(durations) == 60_000
    assert [chunk["text"] for chunk in chunks] == ["[Opening]", "[Turn]", "[Hold]", "[Continue]"]
    assert "falling" in chunks[0]["positive_styles"]
    assert "rising" in chunks[1]["positive_styles"]
    assert "quieter" in chunks[2]["positive_styles"]
    assert all(
        "vocals" in chunk["negative_styles"] and "lyrics" in chunk["negative_styles"]
        for chunk in chunks
    )
    assert all(re.fullmatch(r"\[[A-Za-z ]+\]", str(chunk["text"])) for chunk in chunks)
    encoded = json.dumps(request_body(chunks))
    assert "force_instrumental" not in encoded
    assert "prompt" not in encoded
    assert "latitude" not in encoded
    assert "12.97" not in encoded
    assert MODEL_ID in encoded


def test_later_events_keep_their_musical_change() -> None:
    chunks = compile_chunks(
        (
            {"id": "turn-1", "type": "turn", "audio_offset_ms": 12_000},
            {"id": "pace-1", "type": "pace_change", "audio_offset_ms": 20_000},
            {"id": "pause-1", "type": "pause", "audio_offset_ms": 30_000},
            {"id": "turn-2", "type": "turn", "audio_offset_ms": 48_000},
            {"id": "loop-1", "type": "loop", "audio_offset_ms": 55_000},
        ),
        STYLES,
    )
    texts = [chunk["text"] for chunk in chunks]
    styles = {chunk["text"]: chunk["positive_styles"] for chunk in chunks}

    assert sum(chunk["duration_ms"] for chunk in chunks) == 60_000
    assert texts[0] == "[Opening]"
    assert "falling" in styles["[Opening]"]
    assert "[Turn]" in texts
    assert "rising" in styles["[Turn]"]
    assert "[Pace brighter]" in texts
    assert "pulse" in styles["[Pace brighter]"]
    assert "brighter" in styles["[Pace brighter]"]
    assert "[Hold]" in texts
    assert "quieter" in styles["[Hold]"]
    assert "pulse" not in styles["[Hold]"]
    assert "[Turn falling]" in texts
    assert "falling" in styles["[Turn falling]"]
    assert "[Motif returns]" in texts
    assert "opening motif" in styles["[Motif returns]"]
    assert "falling" in styles["[Motif returns]"]
    held = chunks[texts.index("[Hold]") + 1]
    assert "pulse" in held["positive_styles"]
    assert "brighter" in held["positive_styles"]


def test_a_timeout_is_not_sent_again() -> None:
    post = FakePost(HttpResult("timeout", None, b"", {}))

    receipt = render_arrangement(EVENTS, STYLES, post, lambda _data: (True, 60_000))

    assert len(post.bodies) == 1
    assert receipt.status == "degraded"
    assert receipt.code == "music_unavailable"
    assert receipt.attempts == 1
    assert receipt.audio is None
    assert "sk-" not in repr(receipt)


def test_a_lost_response_is_not_sent_again() -> None:
    post = FakePost(HttpResult("transport", None, b"", {}))

    receipt = render_arrangement(EVENTS, STYLES, post, lambda _data: (True, 60_000))

    assert len(post.bodies) == 1
    assert receipt.status == "degraded"
    assert receipt.attempts == 1


def test_a_short_audio_file_is_not_sent_again() -> None:
    post = FakePost(HttpResult("http", 200, b"ID3short", {"song-id": "song-1"}))

    receipt = render_arrangement(EVENTS, STYLES, post, lambda _data: (True, 3_000))

    assert len(post.bodies) == 1
    assert receipt.status == "degraded"
    assert receipt.song_id == "song-1"
    assert receipt.duration_ms == 3_000
    assert receipt.audio is None


def test_a_checked_file_is_returned_once() -> None:
    post = FakePost(HttpResult("http", 200, b"ID3audio", {"song-id": "song-60"}))

    receipt = render_arrangement(
        EVENTS, STYLES, post, lambda data: (data.startswith(b"ID3"), 60_000)
    )

    assert len(post.bodies) == 1
    assert post.bodies[0]["model_id"] == MODEL_ID
    assert "force_instrumental" not in post.bodies[0]
    assert receipt.status == "rendered"
    assert receipt.song_id == "song-60"
    assert receipt.duration_ms == 60_000
    assert receipt.byte_length == len(b"ID3audio")
    assert receipt.audio == b"ID3audio"
    assert len(receipt.request_sha256) == 64
