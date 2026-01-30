import asyncio

from app.core.database import SessionLocal
from app.repositories.org_repo import OrgRepository
from app.services.crawler_service import CrawlerService


def crawl_and_store(tin: str):
    """
    Sync entry point for RQ worker.
    Internally we run async code.
    """

    async def _run():
        async with SessionLocal() as db:
            repo = OrgRepository(db)
            crawler = CrawlerService()

            data = await crawler.crawl(tin)
            await repo.save(tin, data)

    asyncio.run(_run())
