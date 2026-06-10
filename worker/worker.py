import asyncio
import json
import logging
import signal

from aiokafka import AIOKafkaConsumer

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

from app.core.cache import cache
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.organization import JobStatus
from app.repositories.org_repo import OrgRepository
from app.services.crawler_service import CrawlerService


async def create_consumer():
    while True:
        try:
            consumer = AIOKafkaConsumer(
                "org_jobs",
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id="org-workers",
            )
            await consumer.start()
            logger.info("Kafka consumer connected to %s", settings.KAFKA_BOOTSTRAP_SERVERS)
            return consumer
        except Exception as exc:
            logger.warning(
                "Kafka not ready (%s: %s), retrying in 3s…",
                type(exc).__name__,
                exc,
            )
            await asyncio.sleep(3)


async def process_message(tin: str, crawler: CrawlerService) -> None:
    async with SessionLocal() as db:
        repo = OrgRepository(db)
        await repo.set_status(tin, JobStatus.processing)

    try:
        payload = await crawler.crawl(tin)
    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        logger.error("TIN %s crawl failed — %s", tin, error_msg)
        async with SessionLocal() as db:
            repo = OrgRepository(db)
            await repo.set_failed(tin, error_msg)
        # Evict any stale Redis entry so next request re-checks DB
        await cache.delete(tin)
        return

    async with SessionLocal() as db:
        repo = OrgRepository(db)
        await repo.save_payload(tin, payload)
        await repo.set_status(tin, JobStatus.ready)

    # Populate Redis so the API can serve the result without hitting Postgres
    await cache.set(tin, payload)
    logger.info("TIN %s → ready (cached in Redis)", tin)


async def worker():
    consumer = await create_consumer()
    crawler = CrawlerService()

    semaphore = asyncio.Semaphore(settings.WORKER_CONCURRENCY)
    active_tasks: set[asyncio.Task] = set()

    loop = asyncio.get_running_loop()
    stop_event = asyncio.Event()

    def _shutdown():
        logger.info("Shutdown signal received")
        stop_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _shutdown)

    async def _bounded(tin: str) -> None:
        async with semaphore:
            await process_message(tin, crawler)

    try:
        async for msg in consumer:
            if stop_event.is_set():
                break
            data = json.loads(msg.value)
            tin = data.get("tin")
            if not tin:
                logger.warning("Received message without 'tin': %s", data)
                continue
            logger.info("Dispatching TIN %s (active=%d)", tin, len(active_tasks))
            task = asyncio.create_task(_bounded(tin))
            active_tasks.add(task)
            task.add_done_callback(active_tasks.discard)
    finally:
        # Wait for all in-flight jobs to finish before exiting
        if active_tasks:
            logger.info("Waiting for %d in-flight tasks to finish…", len(active_tasks))
            await asyncio.gather(*active_tasks, return_exceptions=True)
        logger.info("Stopping Kafka consumer…")
        await consumer.stop()
        await cache.close()
        logger.info("Kafka consumer stopped.")


asyncio.run(worker())
