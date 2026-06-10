import re
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import basic_auth
from app.models.user import User
from app.repositories.org_repo import OrgRepository
from app.repositories.search_log_repo import SearchLogRepository
from app.schemas.organization import OrgNotFound, OrgStatusResponse
from app.services.org_service import OrgService

router = APIRouter()

TIN_RE = re.compile(r"^\d{9,14}$")


def _validate_tin(tin: str) -> None:
    if not TIN_RE.match(tin):
        raise HTTPException(
            status_code=422,
            detail="Invalid TIN: must be 9–14 digits.",
        )


def _meta(request: Request, t0: float) -> dict:
    """Build the _meta block injected into every response."""
    return {
        "request_id": getattr(request.state, "request_id", None),
        "elapsed_ms": round((time.perf_counter() - t0) * 1000, 2),
    }


@router.get("/auth/me")
async def auth_me(user: User = Depends(basic_auth)):
    """Verify credentials and return the authenticated username."""
    return {"username": user.username}


@router.get("/org/{tin}")
async def get_org(tin: str, request: Request, user: User = Depends(basic_auth)):
    t0 = time.perf_counter()
    _validate_tin(tin)
    async with SessionLocal() as db:
        repo = OrgRepository(db)
        service = OrgService(repo)
        result = await service.get_or_fetch(tin)
        # Record the search for history tracking
        await SearchLogRepository(db).log(user.username, tin)

    result["_meta"] = _meta(request, t0)
    return result


@router.get("/org/{tin}/status", response_model=OrgStatusResponse)
async def status(tin: str, request: Request, user=Depends(basic_auth)):
    t0 = time.perf_counter()
    _validate_tin(tin)
    async with SessionLocal() as db:
        repo = OrgRepository(db)
        obj = await repo.get_by_tin(tin)

        if not obj:
            return OrgNotFound()

        response = OrgStatusResponse(status=obj.status)
        if obj.status == "failed" and obj.error:
            response.error = obj.error
        response._meta = _meta(request, t0)
        return response


@router.get("/search/history")
async def search_history(user: User = Depends(basic_auth)):
    """Return the current user's most recent TIN searches."""
    async with SessionLocal() as db:
        logs = await SearchLogRepository(db).get_recent(
            user.username, settings.SEARCH_HISTORY_LIMIT
        )
    return [
        {"tin": entry.tin, "searched_at": entry.searched_at.isoformat()}
        for entry in logs
    ]
