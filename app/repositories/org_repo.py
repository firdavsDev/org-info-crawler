from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError

from app.models.organization import JobStatus, Organization


class OrgRepository:

    def __init__(self, db):
        self.db = db

    async def list_orgs(self, q: str | None, status: JobStatus | None, offset: int, limit: int):
        """Return one page of organizations (newest crawl first) and the total match count."""
        stmt = select(Organization)
        if q and q.strip():
            escaped = q.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = f"%{escaped}%"
            stmt = stmt.where(
                or_(
                    Organization.tin.ilike(pattern, escape="\\"),
                    Organization.payload["name"].as_string().ilike(pattern, escape="\\"),
                    Organization.payload["legal_name"].as_string().ilike(pattern, escape="\\"),
                    Organization.payload["director"].as_string().ilike(pattern, escape="\\"),
                )
            )
        if status:
            stmt = stmt.where(Organization.status == status)

        total = await self.db.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = await self.db.execute(
            stmt.order_by(Organization.crawled_at.desc().nulls_last(), Organization.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return rows.scalars().all(), total

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
        from datetime import datetime
        obj = await self.get_by_tin(tin)
        if obj:
            obj.payload = payload
            obj.crawled_at = datetime.utcnow()
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
