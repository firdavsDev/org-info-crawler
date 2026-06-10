from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.models.organization import JobStatus, Organization


class OrgRepository:

    def __init__(self, db):
        self.db = db

    async def get_by_tin(self, tin: str):
        q = await self.db.execute(select(Organization).where(Organization.tin == tin))
        return q.scalar_one_or_none()

    async def save(self, tin: str, payload: dict):
        obj = Organization(tin=tin, payload=payload)
        self.db.add(obj)
        await self.db.commit()
        return obj

    async def get_or_create_job(self, tin: str):
        obj = await self.get_by_tin(tin)

        if obj:
            return obj, False

        try:
            obj = Organization(tin=tin, status=JobStatus.queued, payload={})
            self.db.add(obj)
            await self.db.commit()
            return obj, True

        except IntegrityError:
            await self.db.rollback()
            return await self.get_by_tin(tin), False

    async def set_status(self, tin: str, status: JobStatus):
        obj = await self.get_by_tin(tin)
        if obj:
            obj.status = status
            self.db.add(obj)
            await self.db.commit()

    async def save_payload(self, tin: str, payload: dict):
        obj = await self.get_by_tin(tin)
        if obj:
            obj.payload = payload
            self.db.add(obj)
            await self.db.commit()
            return obj
        return None

    async def set_failed(self, tin: str, error: str):
        obj = await self.get_by_tin(tin)
        if obj:
            obj.status = JobStatus.failed
            obj.error = error[:2000]
            self.db.add(obj)
            await self.db.commit()
