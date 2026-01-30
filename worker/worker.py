import asyncio
import json

from aiokafka import AIOKafkaConsumer

from app.core.database import SessionLocal
from app.models.organization import JobStatus
from app.repositories.org_repo import OrgRepository
from app.services.crawler_service import CrawlerService


async def create_consumer():
    while True:
        try:
            consumer = AIOKafkaConsumer(
                "org_jobs", bootstrap_servers="kafka:9092", group_id="org-workers"
            )
            await consumer.start()
            print("Kafka connected")
            return consumer
        except Exception:
            print("Kafka not ready, retrying in 3s...")
            await asyncio.sleep(3)


async def worker():
    consumer = await create_consumer()
    crawler = CrawlerService()

    async for msg in consumer:
        data = json.loads(msg.value)
        tin = data["tin"]

        async with SessionLocal() as db:
            repo = OrgRepository(db)

            await repo.set_status(tin, JobStatus.processing)

            try:
                payload = await crawler.crawl(tin)
                await repo.save_payload(tin, payload)
                await repo.set_status(tin, JobStatus.ready)
            except Exception:
                await repo.set_status(tin, JobStatus.failed)


asyncio.run(worker())
