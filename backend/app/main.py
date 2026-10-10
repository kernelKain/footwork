from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException
from starlette.types import Scope

from app.jobs.api import install_jobs
from app.jobs.flow import live_dispatch
from app.jobs.service import ProviderDispatch

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DIST = REPO_ROOT / "frontend" / "dist"
DEFAULT_DATA = REPO_ROOT / "var" / "jobs"


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope: Scope):
        try:
            response = await super().get_response(path, scope)
        except HTTPException as exc:
            if exc.status_code == 404 and _use_spa_fallback(path):
                return _index_response(Path(str(self.directory)))
            raise
        if response.status_code == 404 and _use_spa_fallback(path):
            return _index_response(Path(str(self.directory)))
        return response


def create_app(
    frontend_dist: Path | None = None,
    *,
    data_dir: Path | None = None,
    now: Callable[[], datetime] | None = None,
    dispatch: ProviderDispatch | None = None,
) -> FastAPI:
    application = FastAPI(title="Footwork")
    install_jobs(
        application,
        DEFAULT_DATA if data_dir is None else data_dir,
        now=now,
        dispatch=dispatch,
    )
    dist = DEFAULT_DIST if frontend_dist is None else frontend_dist

    @application.get("/health")
    def health() -> dict[str, str]:
        return {
            "status": "ok",
            "api_version": "v1",
            "schema_version": "1",
        }

    if dist.is_dir():
        application.mount("/", SPAStaticFiles(directory=dist, html=True), name="frontend")
    return application


def _use_spa_fallback(path: str) -> bool:
    name = Path(path).name
    return name == "" or "." not in name


def _index_response(dist: Path) -> FileResponse:
    index = dist / "index.html"
    if not index.is_file():
        raise HTTPException(status_code=404, detail="Frontend build is missing.")
    return FileResponse(index)


app = create_app(dispatch=live_dispatch())
