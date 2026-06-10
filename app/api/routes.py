from fastapi import APIRouter, Depends

from app.core.database import SessionLocal
from app.core.security import basic_auth
from app.repositories.org_repo import OrgRepository
from app.services.org_service import OrgService

router = APIRouter()


@router.get("/org/{tin}")
async def get_org(tin: str, user=Depends(basic_auth)):
    async with SessionLocal() as db:
        repo = OrgRepository(db)
        service = OrgService(repo)

        return await service.get_or_fetch(tin)


@router.get("/org/{tin}/status")
async def status(tin: str, user=Depends(basic_auth)):
    async with SessionLocal() as db:
        repo = OrgRepository(db)
        obj = await repo.get_by_tin(tin)

        if not obj:
            return {"status": "not_found"}

        response = {"status": obj.status}
        if obj.status == "failed" and obj.error:
            response["error"] = obj.error
        return response
