import asyncio
import json

from aiokafka import AIOKafkaProducer

from app.core.config import settings

TOPIC = "org_jobs"


class KafkaProducer:

    def __init__(self):
        self.producer = None

    async def start(self):
        while True:
            try:
                self.producer = AIOKafkaProducer(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS
                )
                await self.producer.start()

                print("Kafka connected")
                return

            except Exception as exc:
                print(f"Kafka not ready, retrying: {type(exc).__name__}: {exc}")
                await asyncio.sleep(3)

    async def stop(self):
        if self.producer:
            await self.producer.stop()

    async def send(self, topic: str, payload: dict):
        await self.producer.send_and_wait(topic, json.dumps(payload).encode())


producer = KafkaProducer()
