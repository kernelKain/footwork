import json
import math
from datetime import UTC, datetime
from pathlib import Path
from secrets import token_hex

from app.arrange.gemma import ArrangementOutcome
from app.jobs.flow import WalkDispatch, blocked_arrangement
from app.main import create_app
from app.music.render import MusicReceipt
from fastapi.testclient import TestClient

ORIGIN_LAT = 12.9716
ORIGIN_LON = 77.5946
T0 = 1_700_000_000_000.0


class Clock:
    def __init__(self) -> None:
        self.instant = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.instant


def test_a_recorded_corner_becomes_a_route_sketch(tmp_path: Path) -> None:
    calls = {"music": 0}

    def render(events: object, styles: object) -> MusicReceipt:
        calls["music"] += 1
        raise AssertionError(events, styles)

    client = _client(tmp_path, blocked_arrangement, render)
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=_corner_body(),
        headers=_headers("walk-corner-01", key),
    )

    assert created.status_code == 202
    body = created.json()
    assert body["status"] == "ready"
    assert body["stage"] == "shaping_music"
    assert body["mode"] == "route_sketch"
    assert body["result"]["mode"] == "route_sketch"
    assert body["result"]["provenance"]["model_identity"] is None
    assert calls["music"] == 0
    played = client.get(
        f"/api/v1/jobs/{body['job_id']}/audio",
        headers={"authorization": f"Bearer {key}"},
    )
    assert played.status_code == 200
    assert played.content.startswith(b"RIFF")
    ledger = (tmp_path / "jobs" / "quota-ledger.json").read_text(encoding="utf-8")
    assert "latitude" not in ledger
    assert "12.9716" not in ledger
    (tmp_path / "result.json").write_text(json.dumps(body["result"]), encoding="utf-8")


def test_a_validated_plan_renders_once_and_a_lost_render_stays_a_sketch(tmp_path: Path) -> None:
    calls = {"music": 0}

    def render(events: object, styles: object) -> MusicReceipt:
        calls["music"] += 1
        return MusicReceipt(
            "degraded",
            "music_unavailable",
            "music_v2_5",
            "a" * 64,
            None,
            0,
            None,
            1,
            None,
        )

    client = _client(tmp_path, _valid_plan, render)
    created = client.post(
        "/api/v1/soundprints",
        content=_corner_body(),
        headers=_headers("walk-music-001", token_hex(32)),
    )

    assert created.status_code == 202
    body = created.json()
    assert calls["music"] == 1
    assert body["mode"] == "route_sketch"
    assert body["stage"] == "recording_piece"
    assert "studio_live" not in json.dumps(body["result"]["mode"])


def test_the_same_walk_stays_a_sketch_when_either_provider_fails(tmp_path: Path) -> None:
    body = _corner_body()
    blocked = _client(tmp_path / "arrange", blocked_arrangement, _unused_render)
    lost = _client(tmp_path / "music", _valid_plan, _lost_render)
    first = blocked.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("walk-freeze-arrange", token_hex(32)),
    )
    second = lost.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("walk-freeze-music", token_hex(32)),
    )

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["mode"] == "route_sketch"
    assert first.json()["stage"] == "shaping_music"
    assert second.json()["mode"] == "route_sketch"
    assert second.json()["stage"] == "recording_piece"
    for created in (first, second):
        result = created.json()["result"]
        assert result["mode"] == "route_sketch"
        assert result["mode"] not in {"cached_example", "synthetic_fixture"}
        assert result["provenance"]["mapping_status"] != "human_reviewed_studio"


def _unused_render(events: object, styles: object) -> MusicReceipt:
    raise AssertionError(events, styles)


def _lost_render(events: object, styles: object) -> MusicReceipt:
    return MusicReceipt(
        "degraded",
        "music_unavailable",
        "music_v2_5",
        "c" * 64,
        None,
        0,
        None,
        1,
        None,
    )


def test_a_checked_render_is_studio_live(tmp_path: Path) -> None:
    def render(events: object, styles: object) -> MusicReceipt:
        return MusicReceipt(
            "rendered",
            None,
            "music_v2_5",
            "b" * 64,
            "song-60",
            4,
            60_000,
            1,
            b"ID3ok",
        )

    client = _client(tmp_path, _valid_plan, render)
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=_corner_body(),
        headers=_headers("walk-studio-01", key),
    )

    body = created.json()
    assert body["mode"] == "studio_live"
    assert body["stage"] == "recording_piece"
    assert body["result"]["provenance"]["model_identity"] == "music_v2_5"
    assert body["result"]["audio_format"] == "audio/mpeg"
    played = client.get(
        f"/api/v1/jobs/{body['job_id']}/audio",
        headers={"authorization": f"Bearer {key}"},
    )
    assert played.content == b"ID3ok"


def _client(tmp_path: Path, arrange: object, render: object) -> TestClient:
    dispatch = WalkDispatch(arrange, render)
    return TestClient(
        create_app(tmp_path / "missing", data_dir=tmp_path / "jobs", now=Clock(), dispatch=dispatch)
    )


def _valid_plan(events: list[dict[str, object]]) -> ArrangementOutcome:
    refs = [str(event["id"]) for event in events[:1]] or ["turn-1"]
    return ArrangementOutcome(
        "valid",
        {"mood": "warm_cinematic", "style": ["instrumental", "warm"], "event_refs": refs},
        None,
        None,
        "validated",
        "google/gemma-4-E2B-it",
        "revision",
        1,
        0,
    )


def _corner_body() -> bytes:
    samples = []
    for index in range(31):
        t_ms = index * 3_000
        if t_ms <= 42_000:
            x_m, y_m = 1.5 * t_ms / 1000.0, 0.0
        else:
            elapsed_s = (t_ms - 42_000) / 1000.0
            x_m = 1.5 * 42.0 + 1.5 * elapsed_s * math.cos(math.radians(70))
            y_m = 1.5 * elapsed_s * math.sin(math.radians(70))
        samples.append(
            {
                "latitude": ORIGIN_LAT + (y_m / 6_371_000.0) * (180.0 / math.pi),
                "longitude": ORIGIN_LON
                + (x_m / (6_371_000.0 * math.cos(math.radians(ORIGIN_LAT)))) * (180.0 / math.pi),
                "accuracy_m": 5,
                "timestamp_ms": T0 + t_ms,
            }
        )
    return json.dumps(
        {
            "schema_version": "1",
            "mood": "warm_cinematic",
            "consent_version": "1",
            "samples": samples,
        }
    ).encode()


def _headers(idempotency_key: str, job_key: str) -> dict[str, str]:
    return {
        "content-type": "application/json",
        "x-idempotency-key": idempotency_key,
        "x-job-key": job_key,
    }
