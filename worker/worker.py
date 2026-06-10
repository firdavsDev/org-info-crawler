import asyncio
import json
import logging
import signal
from datetime import datetime, timezone

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
logger = logging.getLogger(__name__)

from app.core.cache import cache
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.organization import JobStatus
from app.repositories.org_repo import OrgRepository
from app.services.crawler_service import CrawlerService


async def _connect_consumer() -> AIOKafkaConsumer:
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
            logger.warning("Kafka not ready (%s: %s), retrying in 3s…", type(exc).__name__, exc)
            await asyncio.sleep(3)


async def _connect_producer() -> AIOKafkaProducer:
    while True:
        try:
            producer = AIOKafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS
            )
            await producer.start()
            logger.info("Kafka producer ready")
            return producer
        except Exception as exc:
            logger.warning("Kafka producer not ready (%s: %s), retrying in 3s…", type(exc).__name__, exc)
            await asyncio.sleep(3)


async def _send(producer: AIOKafkaProducer, topic: str, payload: dict) -> None:
    await producer.send_and_wait(topic, json.dumps(payload, ensure_ascii=False).encode())


async def process_message(
    msg_payload: dict,
    crawler: CrawlerService,
    producer: AIOKafkaProducer,
) -> None:
    tin: str = msg_payload["tin"]
    attempts: int = msg_payload.get("attempts", 0)

    async with SessionLocal() as db:
        repo = OrgRepository(db)
        await repo.set_status(tin, JobStatus.processing)

    try:
        payload = await crawler.crawl(tin)
    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}"
        next_attempt = attempts + 1

        if next_attempt < settings.WORKER_MAX_RETRIES:
            # Transient failure — re-queue with incremented counter
            logger.warning(
                "TIN %s crawl failed (attempt %d/%d) — re-queuing: %s",
                tin, next_attempt, settings.WORKER_MAX_RETRIES, error_msg,
            )
            async with SessionLocal() as db:
                repo = OrgRepository(db)
                await repo.set_status(tin, JobStatus.queued)
            await _send(producer, "org_jobs", {"tin": tin, "attempts": next_attempt})
        else:
            # Permanent failure — mark in DB and route to DLQ
            logger.error(
                "TIN %s permanently failed after %d attempts — sending to DLQ: %s",
                tin, next_attempt, error_msg,
            )
            async with SessionLocal() as db:
                repo = OrgRepository(db)
                await repo.set_failed(tin, error_msg)
            await cache.delete(tin)
            dlq_payload = {
                "tin": tin,
                "attempts": next_attempt,
                "error": error_msg,
                "failed_at": datetime.now(tz=timezone.utc).isoformat(),
            }
            await _send(producer, settings.KAFKA_DLQ_TOPIC, dlq_payload)
            logger.info("TIN %s → DLQ (%s)", tin, settings.KAFKA_DLQ_TOPIC)
        return

    async with SessionLocal() as db:
        repo = OrgRepository(db)
        await repo.save_payload(tin, payload)
        await repo.set_status(tin, JobStatus.ready)

    await cache.set(tin, payload)
    logger.info("TIN %s → ready (attempt %d, cached in Redis)", tin, attempts + 1)


async def worker():
    consumer = await _connect_consumer()
    producer = await _connect_producer()
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

    async def _bounded(msg_payload: dict) -> None:
        async with semaphore:
            await process_message(msg_payload, crawler, producer)

    try:
        async for msg in consumer:
            if stop_event.is_set():
                break
            msg_payload = json.loads(msg.value)
            tin = msg_payload.get("tin")
            if not tin:
                logger.warning("Received message without 'tin': %s", msg_payload)
                continue
            attempts = msg_payload.get("attempts", 0)
            logger.info("Dispatching TIN %s (attempt %d, active=%d)", tin, attempts + 1, len(active_tasks))
            task = asyncio.create_task(_bounded(msg_payload))
            active_tasks.add(task)
            task.add_done_callback(active_tasks.discard)
    finally:
        if active_tasks:
            logger.info("Waiting for %d in-flight tasks to finish…", len(active_tasks))
            await asyncio.gather(*active_tasks, return_exceptions=True)
        logger.info("Stopping Kafka consumer/producer…")
        await consumer.stop()
        await producer.stop()
        await cache.close()
        logger.info("Worker stopped.")


asyncio.run(worker())
