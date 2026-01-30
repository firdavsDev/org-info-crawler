from app.core.kafka import producer
from app.repositories.org_repo import OrgRepository


class OrgService:

    def __init__(self, repo: OrgRepository):
        self.repo = repo

    async def get_or_fetch(self, tin: str):

        obj, created = await self.repo.get_or_create_job(tin)

        if obj.status == "ready":
            return {"status": "ready", "data": obj.payload}

        if created:
            await producer.send("org_jobs", {"tin": tin})

        return {"status": obj.status}
