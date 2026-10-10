"""HTTP surface for protected generation jobs."""

from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.responses import Response

from app.jobs.privacy import access_event
from app.jobs.service import JobError, JobService, ProviderDispatch

router = APIRouter()


def install_jobs(
    application: FastAPI,
    data_dir: Path,
    *,
    ledger_path: Path | None = None,
    artifacts_dir: Path | None = None,
    now: Callable[[], datetime] | None = None,
    dispatch: ProviderDispatch | None = None,
) -> JobService:
    """Wire the JobService and its routes into the FastAPI application."""
    service = JobService(
        data_dir,
        ledger_path=ledger_path,
        artifacts_dir=artifacts_dir,
        now=now,
        dispatch=dispatch,
    )
    application.state.jobs = service
    application.add_exception_handler(JobError, _job_error)
    application.include_router(router)
    return service


async def _job_error(_request: Request, exc: Exception) -> JSONResponse:
    """Render a JobError (or unknown exception) as its public JSON envelope."""
    error = exc if isinstance(exc, JobError) else JobError("processing_unavailable")
    access_event(error_code=error.code)
    return JSONResponse(status_code=error.status, content=error.envelope(), headers=error.headers)


def _jobs(request: Request) -> JobService:
    """Return the app's JobService, raising if it is not configured."""
    service = request.app.state.jobs
    if not isinstance(service, JobService):
        raise JobError("processing_unavailable")
    return service


@router.get("/api/v1/capabilities")
def capabilities(request: Request) -> dict[str, object]:
    """Return the service's current capabilities."""
    return _jobs(request).capabilities()


@router.post("/api/v1/soundprints")
async def create_soundprint(request: Request) -> JSONResponse:
    """Submit a new walk and return the created (or replayed) job."""
    if _media_type(request) != "application/json":
        raise JobError("invalid_request")
    view = _jobs(request).submit(
        await request.body(),
        request.headers.get("x-idempotency-key", ""),
        request.headers.get("x-job-key", ""),
    )
    return JSONResponse(status_code=202, content=view.public())


@router.get("/api/v1/jobs/{job_id}")
def read_job(job_id: str, request: Request) -> dict[str, object]:
    """Return the current status and result of a job."""
    return _jobs(request).get(job_id, _bearer(request)).public()


@router.get("/api/v1/jobs/{job_id}/audio")
def read_audio(job_id: str, request: Request) -> FileResponse:
    """Stream the job's rendered audio file."""
    return FileResponse(
        _jobs(request).audio_file(job_id, _bearer(request)),
        media_type="application/octet-stream",
    )


@router.delete("/api/v1/jobs/{job_id}", status_code=204)
def delete_job(job_id: str, request: Request) -> Response:
    """Delete a job's stored result."""
    _jobs(request).delete(job_id, _optional_bearer(request))
    return Response(status_code=204)


def _media_type(request: Request) -> str:
    """Return the request's content type, without parameters."""
    return request.headers.get("content-type", "").split(";", 1)[0].strip().lower()


def _bearer(request: Request) -> str:
    """Return the bearer token, raising if none was presented."""
    token = _optional_bearer(request)
    if token is None:
        raise JobError("invalid_capability")
    return token


def _optional_bearer(request: Request) -> str | None:
    """Return the bearer token from the Authorization header, if present and well-formed."""
    header = request.headers.get("authorization")
    if header is None:
        return None
    prefix = "Bearer "
    if not header.startswith(prefix):
        return ""
    return header[len(prefix) :].strip()
