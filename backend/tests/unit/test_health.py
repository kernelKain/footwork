from pathlib import Path

from app.main import create_app
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
