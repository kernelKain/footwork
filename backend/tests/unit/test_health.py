from pathlib import Path

import pytest
from app.jobs.flow import generation_disabled, live_dispatch
from app.jobs.service import ELEVEN_ATTEMPT_LIMIT, GEMMA_ATTEMPT_LIMIT, GPU_SECOND_LIMIT
from app.main import create_app, store_paths
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parents[3]


def test_health_stays_available_without_a_frontend_build(tmp_path: Path) -> None:
    client = TestClient(create_app(tmp_path / "missing-dist"))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "api_version": "v1",
        "schema_version": "1",
    }
    assert client.get("/").status_code == 404


def test_frontend_routes_use_the_built_shell(tmp_path: Path) -> None:
    dist = tmp_path / "dist"
    assets = dist / "assets"
    assets.mkdir(parents=True)
    (dist / "index.html").write_text(
        "<!doctype html><title>Footwork</title><h1>Footwork</h1>",
        encoding="utf-8",
    )
    (assets / "app.js").write_text("console.log(1)\n", encoding="utf-8")
    client = TestClient(create_app(dist))

    assert "Footwork" in client.get("/").text
    assert "Footwork" in client.get("/studio").text
    assert "Footwork" in client.get("/about").text
    assert "console.log" in client.get("/assets/app.js").text
    assert client.get("/assets/missing.js").status_code == 404


def test_render_blueprint_matches_the_locked_host() -> None:
    blueprint = (REPO_ROOT / "deploy" / "render.yaml").read_text(encoding="utf-8")

    assert "runtime: python" in blueprint
    assert "plan: 1c-2g" in blueprint
    assert "healthCheckPath: /health" in blueprint
    assert "autoDeployTrigger: off" in blueprint
    assert "ELEVENLABS_API_KEY" not in blueprint or "sync: false" in blueprint
    assert "sk-" not in blueprint
    assert "hf_" not in blueprint
    assert 'value: "false"' in blueprint
    assert "mountPath: /var/footwork" in blueprint
    assert "/var/footwork/artifacts" in blueprint
    assert "/var/footwork/quota.json" in blueprint
    assert "MAX_GEMMA_ATTEMPTS_PER_DAY" in blueprint and 'value: "4"' in blueprint
    assert "MAX_GEMMA_GPU_SECONDS_PER_DAY" in blueprint and 'value: "240"' in blueprint
    assert "MAX_MUSIC_ATTEMPTS_PER_DAY" in blueprint and 'value: "6"' in blueprint
    assert GEMMA_ATTEMPT_LIMIT == 4
    assert GPU_SECOND_LIMIT == 240
    assert ELEVEN_ATTEMPT_LIMIT == 6


def test_release_store_follows_the_disk_env(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    ledger = tmp_path / "quota.json"
    artifacts = tmp_path / "artifacts"
    monkeypatch.setenv("LEDGER_PATH", str(ledger))
    monkeypatch.setenv("ARTIFACT_DIR", str(artifacts))
    monkeypatch.setenv("APP_ENV", "production")

    data_dir, ledger_path, artifacts_dir = store_paths()
    client = TestClient(create_app(tmp_path / "missing"))

    assert data_dir == tmp_path
    assert ledger_path == ledger
    assert artifacts_dir == artifacts
    assert client.app.state.jobs.ledger.path == ledger
    assert client.app.state.jobs.artifacts == artifacts
    assert client.get("/health").status_code == 200


def test_production_refuses_to_start_without_the_disk(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("LEDGER_PATH", raising=False)
    monkeypatch.delenv("ARTIFACT_DIR", raising=False)

    with pytest.raises(RuntimeError, match="LEDGER_PATH and ARTIFACT_DIR"):
        store_paths()


def test_live_generation_stays_off(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GENERATION_ENABLED", raising=False)

    assert live_dispatch().render is generation_disabled

    monkeypatch.setenv("GENERATION_ENABLED", "true")

    assert live_dispatch().render is not generation_disabled
