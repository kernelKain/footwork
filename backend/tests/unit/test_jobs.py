import json
import logging
import math
import threading
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from secrets import token_hex

import pytest
from app.jobs.flow import WalkOutcome
from app.jobs.ledger import Ledger
from app.jobs.privacy import LOG
from app.jobs.service import (
    GPU_RESERVE_SECONDS,
    GPU_SECOND_LIMIT,
    JobService,
)
from app.main import create_app
from fastapi.testclient import TestClient

ORIGIN_LAT = 12.9716
ORIGIN_LON = 77.5946
T0 = 1_700_000_000_000.0
DAY = "2026-10-10"


class Clock:
    def __init__(self) -> None:
        self.instant = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)

    def __call__(self) -> datetime:
        return self.instant


class Spy:
    def __init__(self, ledger: Path) -> None:
        self.ledger = ledger
        self.job_ids: list[str] = []
        self.usage: list[dict[str, object]] = []

    def start(self, job_id: str) -> None:
        payload = json.loads(self.ledger.read_text(encoding="utf-8"))
        usage = payload["usage"]
        if isinstance(usage, dict):
            self.usage.append(usage)
        self.job_ids.append(job_id)


def test_a_retry_returns_the_same_job_and_reserves_once(tmp_path: Path) -> None:
    data, _clock, spy, client = _app(tmp_path)
    body = _walk()
    key = token_hex(32)
    headers = _headers("idem-retry-01", key)

    first = client.post("/api/v1/soundprints", content=body, headers=headers)
    second = client.post("/api/v1/soundprints", content=body, headers=headers)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["job_id"] == second.json()["job_id"]
    assert first.json()["stage"] == "reading_walk"
    assert "percent" not in first.json()
    assert spy.job_ids == [first.json()["job_id"]]
    assert spy.usage[0][DAY] == {
        "gemma_attempts": 1,
        "gpu_seconds": GPU_RESERVE_SECONDS,
        "eleven_attempts": 1,
    }
    assert _usage(data)["gemma_attempts"] == 1
    _assert_private(data, key, "idem-retry-01")


def test_a_changed_body_conflicts_without_a_second_reservation(tmp_path: Path) -> None:
    data, _clock, spy, client = _app(tmp_path)
    key = token_hex(32)
    original = json.loads(_walk())
    changed = json.loads(_walk())
    changed["samples"][-1]["timestamp_ms"] += 1_000

    first = client.post(
        "/api/v1/soundprints",
        content=_dump(original),
        headers=_headers("idem-conflict-01", key),
    )
    second = client.post(
        "/api/v1/soundprints",
        content=_dump(changed),
        headers=_headers("idem-conflict-01", key),
    )

    assert first.status_code == 202
    assert second.status_code == 409
    assert second.json()["code"] == "conflicting_request"
    assert "12.9716" not in second.text
    assert len(spy.job_ids) == 1
    assert _usage(data)["gemma_attempts"] == 1


def test_one_active_job_blocks_a_different_request(tmp_path: Path) -> None:
    data, _clock, spy, client = _app(tmp_path)
    body = _walk()

    first = client.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("idem-active-01", token_hex(32)),
    )
    second = client.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("idem-active-02", token_hex(32)),
    )

    assert first.status_code == 202
    assert second.status_code == 409
    assert second.json()["code"] == "active_job"
    assert len(spy.job_ids) == 1
    assert _usage(data)["eleven_attempts"] == 1


def test_quota_is_kept_after_delete_and_blocks_the_next_piece(tmp_path: Path) -> None:
    data, _clock, spy, client = _app(tmp_path)
    body = _walk()

    for index in range(4):
        key = token_hex(32)
        created = client.post(
            "/api/v1/soundprints",
            content=body,
            headers=_headers(f"idem-quota-{index}", key),
        )
        assert created.status_code == 202
        deleted = client.delete(
            f"/api/v1/jobs/{created.json()['job_id']}",
            headers={"authorization": f"Bearer {key}"},
        )
        assert deleted.status_code == 204

    blocked = client.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("idem-quota-blocked", token_hex(32)),
    )

    assert blocked.status_code == 429
    assert blocked.json()["code"] == "generation_limit"
    assert blocked.json()["retryable"] is False
    assert "balance" not in blocked.text
    assert len(spy.job_ids) == 4
    assert _usage(data) == {
        "gemma_attempts": 4,
        "gpu_seconds": GPU_SECOND_LIMIT,
        "eleven_attempts": 4,
    }


def test_a_partial_gpu_remainder_is_refused_before_dispatch(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    clock = Clock()
    ledger = Ledger(data / "quota-ledger.json", clock)

    def seed(payload: dict[str, object]) -> None:
        payload["usage"] = {
            DAY: {
                "gemma_attempts": 0,
                "gpu_seconds": GPU_SECOND_LIMIT - GPU_RESERVE_SECONDS + 1,
                "eleven_attempts": 0,
            }
        }

    ledger.transact(seed)
    spy = Spy(data / "quota-ledger.json")
    client = TestClient(create_app(tmp_path / "missing", data_dir=data, now=clock, dispatch=spy))

    response = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-partial-01", token_hex(32)),
    )

    assert response.status_code == 429
    assert spy.job_ids == []
    assert _usage(data)["gpu_seconds"] == GPU_SECOND_LIMIT - GPU_RESERVE_SECONDS + 1


def test_restart_interrupts_the_job_and_keeps_the_reservation(tmp_path: Path) -> None:
    data, clock, spy, client = _app(tmp_path)
    body = _walk()
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("idem-restart-01", key),
    )
    job_id = created.json()["job_id"]
    restarted_spy = Spy(data / "quota-ledger.json")
    restarted = TestClient(
        create_app(tmp_path / "missing", data_dir=data, now=clock, dispatch=restarted_spy)
    )

    status = restarted.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {key}"})
    replay = restarted.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("idem-restart-01", key),
    )
    retried = restarted.post(
        "/api/v1/soundprints",
        content=body,
        headers=_headers("idem-restart-02", token_hex(32)),
    )

    assert status.status_code == 200
    assert status.json()["status"] == "interrupted"
    assert status.json()["error"]["code"] == "interrupted"
    assert replay.status_code == 202
    assert replay.json()["job_id"] == job_id
    assert restarted_spy.job_ids == [retried.json()["job_id"]]
    assert retried.json()["job_id"] != job_id
    assert _usage(data)["gemma_attempts"] == 2
    assert len(spy.job_ids) == 1


def test_an_unknown_provider_outcome_keeps_the_reservation(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    clock = Clock()

    class Ambiguous(Spy):
        def start(self, job_id: str) -> None:
            super().start(job_id)
            raise TimeoutError("connection reset sk-live-secret")

    spy = Ambiguous(data / "quota-ledger.json")
    client = TestClient(create_app(tmp_path / "missing", data_dir=data, now=clock, dispatch=spy))
    response = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-unknown-01", token_hex(32)),
    )
    saved = (data / "quota-ledger.json").read_text(encoding="utf-8")

    assert response.status_code == 202
    assert response.json()["status"] == "interrupted"
    assert response.json()["error"]["code"] == "provider_unknown"
    assert response.json()["error"]["retryable"] is False
    assert "sk-live-secret" not in response.text
    assert "sk-live-secret" not in saved
    assert spy.usage[0][DAY]["gpu_seconds"] == GPU_RESERVE_SECONDS
    assert _usage(data)["gpu_seconds"] == GPU_RESERVE_SECONDS


def test_overlapping_retries_create_one_job(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    clock = Clock()
    spy = Spy(data / "quota-ledger.json")
    service = JobService(data, now=clock, dispatch=spy)
    body = _walk()
    key = token_hex(32)
    barrier = threading.Barrier(2)
    found: list[str] = []

    def submit() -> None:
        barrier.wait()
        found.append(service.submit(body, "idem-race-0001", key).job_id)
        time.sleep(0.05)

    threads = [threading.Thread(target=submit) for _ in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert found[0] == found[1]
    assert spy.job_ids == [found[0]]
    assert _usage(data)["gemma_attempts"] == 1


def test_capabilities_stay_coarse_and_jobs_require_the_right_key(tmp_path: Path) -> None:
    data, clock, _spy, client = _app(tmp_path)
    key = token_hex(32)
    other = token_hex(32)
    open_state = client.get("/api/v1/capabilities")
    created = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-access-01", key),
    )
    job_id = created.json()["job_id"]
    audio = data / "artifacts" / job_id / "audio"
    audio.parent.mkdir(parents=True)
    audio.write_bytes(b"RIFF-footwork-audio")

    assert open_state.status_code == 200
    assert open_state.json()["generation"] == "open"
    assert open_state.json()["providers"] == {"arrangement": "unavailable", "music": "unavailable"}
    assert "gpu_seconds" not in open_state.text
    assert "balance" not in open_state.text
    assert client.get("/api/v1/capabilities").json()["generation"] == "capped"
    assert client.get(f"/api/v1/jobs/{job_id}").status_code == 401
    wrong = client.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {other}"})
    assert wrong.status_code == 401
    assert job_id not in wrong.text
    owned = client.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {key}"})
    assert owned.status_code == 200
    assert owned.json()["mode"] is None
    denied_audio = client.get(
        f"/api/v1/jobs/{job_id}/audio",
        headers={"authorization": f"Bearer {other}"},
    )
    assert denied_audio.status_code == 401
    assert b"RIFF-footwork-audio" not in denied_audio.content
    played = client.get(
        f"/api/v1/jobs/{job_id}/audio",
        headers={"authorization": f"Bearer {key}"},
    )
    assert played.status_code == 200
    assert played.content == b"RIFF-footwork-audio"
    assert client.get("/api/v1/jobs/not-a-job/audio").status_code == 401
    assert client.delete(f"/api/v1/jobs/{token_hex(16)}").status_code == 204
    assert (
        client.delete(
            f"/api/v1/jobs/{job_id}",
            headers={"authorization": f"Bearer {other}"},
        ).status_code
        == 401
    )

    clock.instant += timedelta(minutes=61)
    assert (
        client.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {key}"}).status_code
        == 410
    )
    assert (
        client.get(
            f"/api/v1/jobs/{job_id}/audio",
            headers={"authorization": f"Bearer {key}"},
        ).status_code
        == 410
    )
    _assert_private(data, key, "idem-access-01")
    assert (data / "quota-ledger.json").stat().st_mode & 0o077 == 0


def test_a_short_or_invalid_walk_does_not_reserve_budget(tmp_path: Path) -> None:
    data, _clock, spy, client = _app(tmp_path)
    short = {
        "schema_version": "1",
        "mood": "warm_cinematic",
        "consent_version": "1",
        "samples": [
            {
                "latitude": ORIGIN_LAT,
                "longitude": ORIGIN_LON,
                "accuracy_m": 5,
                "timestamp_ms": T0,
            }
        ],
    }
    rejected = client.post(
        "/api/v1/soundprints",
        content=_dump(short),
        headers=_headers("idem-short-0001", token_hex(32)),
    )
    invalid = client.post(
        "/api/v1/soundprints",
        content=_dump({**short, "mood": "night_drive"}),
        headers=_headers("idem-mood-00001", token_hex(32)),
    )
    oversized = client.post(
        "/api/v1/soundprints",
        content=b'{"schema_version":"1"}' + (b" " * (1_048_576)),
        headers=_headers("idem-size-00001", token_hex(32)),
    )

    assert rejected.status_code == 422
    assert rejected.json()["code"] == "trace_too_short"
    assert "12.9716" not in rejected.text
    assert invalid.status_code == 400
    assert "12.9716" not in invalid.text
    assert oversized.status_code == 413
    assert spy.job_ids == []
    assert not (data / "quota-ledger.json").exists()
    assert client.get("/health").json()["schema_version"] == "1"


class _Finishing:
    def __init__(self, audio: bytes) -> None:
        self.complete = None
        self.audio = audio

    def start(self, job_id: str) -> None:
        if self.complete is None:
            raise RuntimeError("completion is not connected")
        self.complete(
            job_id,
            WalkOutcome(
                mode="route_sketch",
                stage="shaping_music",
                stages=("reading_walk", "shaping_music"),
                result={"schema_version": "1", "mode": "route_sketch"},
                audio=self.audio,
            ),
        )


class _Leaky:
    def __init__(self) -> None:
        self.complete = None

    def start(self, job_id: str) -> None:
        if self.complete is None:
            raise RuntimeError("completion is not connected")
        self.complete(
            job_id,
            WalkOutcome(
                mode="route_sketch",
                stage="shaping_music",
                stages=("reading_walk",),
                result={"latitude": ORIGIN_LAT, "longitude": ORIGIN_LON},
                audio=b"should-not-be-stored",
            ),
        )


def test_another_jobs_capability_cannot_read_or_delete(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    clock = Clock()
    client = TestClient(
        create_app(tmp_path / "missing", data_dir=data, now=clock, dispatch=_Finishing(b"audio-a"))
    )
    key_a = token_hex(32)
    key_b = token_hex(32)
    first = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-cross-01", key_a),
    )
    second = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-cross-02", key_b),
    )
    job_a = first.json()["job_id"]
    job_b = second.json()["job_id"]
    audio_a = data / "artifacts" / job_a / "audio"

    denied = client.get(f"/api/v1/jobs/{job_a}", headers={"authorization": f"Bearer {key_b}"})
    denied_audio = client.get(
        f"/api/v1/jobs/{job_a}/audio",
        headers={"authorization": f"Bearer {key_b}"},
    )
    denied_delete = client.delete(
        f"/api/v1/jobs/{job_a}",
        headers={"authorization": f"Bearer {key_b}"},
    )

    assert first.status_code == 202
    assert second.status_code == 202
    assert job_a != job_b
    assert denied.status_code == 401
    assert denied.json()["code"] == "invalid_capability"
    assert "12.9716" not in denied.text
    assert b"audio-a" not in denied.content
    assert denied_audio.status_code == 401
    assert b"audio-a" not in denied_audio.content
    assert denied_delete.status_code == 401
    assert audio_a.read_bytes() == b"audio-a"
    assert (
        client.get(
            f"/api/v1/jobs/{job_b}", headers={"authorization": f"Bearer {key_a}"}
        ).status_code
        == 401
    )

    removed = client.delete(f"/api/v1/jobs/{job_a}", headers={"authorization": f"Bearer {key_a}"})
    assert removed.status_code == 204
    assert not audio_a.exists()
    assert _usage(data)["gemma_attempts"] == 2
    _assert_private(data, key_a, "idem-cross-01")
    _assert_private(data, key_b, "idem-cross-02")

    restarted = TestClient(
        create_app(tmp_path / "missing", data_dir=data, now=clock, dispatch=_Finishing(b"audio-c"))
    )
    third = restarted.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-cross-03", token_hex(32)),
    )
    assert third.status_code == 202
    assert _usage(data)["gemma_attempts"] == 3


def test_startup_removes_expired_audio_and_keeps_the_cap(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    clock = Clock()
    client = TestClient(
        create_app(
            tmp_path / "missing",
            data_dir=data,
            now=clock,
            dispatch=_Finishing(b"startup-audio"),
        )
    )
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-startup-01", key),
    )
    job_id = created.json()["job_id"]
    audio = data / "artifacts" / job_id / "audio"
    assert audio.read_bytes() == b"startup-audio"

    clock.instant += timedelta(minutes=61)
    JobService(data, now=clock)

    assert not audio.exists()
    assert _usage(data)["gemma_attempts"] == 1


def test_expired_audio_is_removed_and_the_cap_survives(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    clock = Clock()
    client = TestClient(
        create_app(
            tmp_path / "missing",
            data_dir=data,
            now=clock,
            dispatch=_Finishing(b"expired-audio"),
        )
    )
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-expire-01", key),
    )
    job_id = created.json()["job_id"]
    audio = data / "artifacts" / job_id / "audio"
    assert audio.read_bytes() == b"expired-audio"

    clock.instant += timedelta(minutes=61)
    expired = client.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {key}"})

    assert expired.status_code == 410
    assert expired.json()["code"] == "expired"
    assert not audio.exists()
    assert "12.9716" not in expired.text
    assert _usage(data)["gemma_attempts"] == 1
    restarted = TestClient(
        create_app(
            tmp_path / "missing", data_dir=data, now=clock, dispatch=Spy(data / "quota-ledger.json")
        )
    )
    replay = restarted.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-expire-02", token_hex(32)),
    )
    assert replay.status_code == 202
    assert _usage(data)["gemma_attempts"] == 2


def test_a_located_result_is_not_stored(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    client = TestClient(
        create_app(tmp_path / "missing", data_dir=data, now=Clock(), dispatch=_Leaky())
    )
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-leak-0001", key),
    )
    saved = (data / "quota-ledger.json").read_text(encoding="utf-8")

    assert created.status_code == 202
    assert created.json()["status"] == "interrupted"
    assert created.json()["error"]["code"] == "provider_unknown"
    assert "12.9716" not in created.text
    assert "latitude" not in saved
    assert "12.9716" not in saved
    assert not (data / "artifacts").exists()
    assert _usage(data)["gemma_attempts"] == 1


def test_job_log_omits_locations_capabilities_and_keys(
    tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.INFO, logger="footwork.jobs")
    data = tmp_path / "jobs"
    client = TestClient(
        create_app(
            tmp_path / "missing", data_dir=data, now=Clock(), dispatch=_Finishing(b"audio-log")
        )
    )
    key = token_hex(32)
    created = client.post(
        "/api/v1/soundprints",
        content=_walk(),
        headers=_headers("idem-log-00001", key),
    )
    job_id = created.json()["job_id"]
    client.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {key}"})
    client.get(f"/api/v1/jobs/{job_id}", headers={"authorization": f"Bearer {token_hex(32)}"})
    LOG.info("latitude 12.9716 authorization Bearer %s sk-live-secret", key)

    text = caplog.text
    assert job_id in text
    assert "shaping_music" in text
    assert "invalid_capability" in text
    assert "12.9716" not in text
    assert "latitude" not in text
    assert key not in text
    assert "idem-log-00001" not in text
    assert "Bearer" not in text
    assert "authorization" not in text.lower()
    assert "sk-live-secret" not in text


def test_a_corrupt_ledger_stays_generic(tmp_path: Path) -> None:
    data = tmp_path / "jobs"
    data.mkdir()
    (data / "quota-ledger.json").write_text("{", encoding="utf-8")
    client = TestClient(create_app(tmp_path / "missing", data_dir=data, now=Clock()))

    response = client.get("/api/v1/capabilities")

    assert response.status_code == 503
    assert response.json()["code"] == "processing_unavailable"
    assert "quota-ledger" not in response.text
    assert "JSONDecodeError" not in response.text
    assert "Expecting value" not in response.text


def _app(tmp_path: Path) -> tuple[Path, Clock, Spy, TestClient]:
    data = tmp_path / "jobs"
    clock = Clock()
    spy = Spy(data / "quota-ledger.json")
    client = TestClient(create_app(tmp_path / "missing", data_dir=data, now=clock, dispatch=spy))
    return data, clock, spy, client


def _walk() -> bytes:
    samples = [
        {
            "latitude": ORIGIN_LAT + (index * 4.5 / 6_371_000.0) * (180.0 / math.pi),
            "longitude": ORIGIN_LON,
            "accuracy_m": 8,
            "timestamp_ms": T0 + index * 3_000,
        }
        for index in range(31)
    ]
    return _dump(
        {
            "schema_version": "1",
            "mood": "warm_cinematic",
            "consent_version": "1",
            "samples": samples,
        }
    )


def _dump(body: dict[str, object]) -> bytes:
    return json.dumps(body, separators=(",", ":")).encode()


def _headers(idempotency_key: str, job_key: str) -> dict[str, str]:
    return {
        "content-type": "application/json",
        "x-idempotency-key": idempotency_key,
        "x-job-key": job_key,
    }


def _usage(data: Path) -> dict[str, int]:
    payload = json.loads((data / "quota-ledger.json").read_text(encoding="utf-8"))
    usage = payload["usage"][DAY]
    assert isinstance(usage, dict)
    return usage


def _assert_private(data: Path, job_key: str, idempotency_key: str) -> None:
    text = (data / "quota-ledger.json").read_text(encoding="utf-8")
    assert job_key not in text
    assert idempotency_key not in text
    assert "latitude" not in text
    assert "12.9716" not in text
