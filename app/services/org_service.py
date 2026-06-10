from datetime import datetime

from app.core.cache import cache
from app.core.config import settings
from app.core.kafka import producer
from app.models.organization import JobStatus
from app.repositories.org_repo import OrgRepository


def _is_expired(obj) -> bool:
    """Return True when a ready record is older than CACHE_TTL_DAYS."""
    if settings.CACHE_TTL_DAYS <= 0:
        return False
    if obj.crawled_at is None:
        return True  # legacy row with no timestamp – treat as expired
    age = datetime.utcnow() - obj.crawled_at
    return age.days >= settings.CACHE_TTL_DAYS


class OrgService:

    def __init__(self, repo: OrgRepository):
        self.repo = repo

    async def get_or_fetch(self, tin: str):
        # 1. Redis fast-path
        cached = await cache.get(tin)
        if cached is not None:
            return {"status": "ready", "data": cached}

        # 2. DB lookup
        obj, created = await self.repo.get_or_create_job(tin)

        if obj.status == JobStatus.ready:
            if not _is_expired(obj):
                # Populate Redis for next time
                await cache.set(tin, obj.payload)
                return {"status": "ready", "data": obj.payload}
            # Cache expired – re-queue transparently.
            await cache.delete(tin)
            await self.repo.set_status(tin, JobStatus.queued)
            await producer.send("org_jobs", {"tin": tin})
            return {"status": "queued"}

        # Re-queue a previously failed job so the caller can trigger a retry.
        if obj.status == JobStatus.failed:
            await cache.delete(tin)
            await self.repo.set_status(tin, JobStatus.queued)
            await producer.send("org_jobs", {"tin": tin})
            return {"status": "queued"}

        # First time seen: new record was created and is already queued.
        if created:
            await producer.send("org_jobs", {"tin": tin})

        # Already queued or processing – no duplicate Kafka message.
        return {"status": obj.status}
