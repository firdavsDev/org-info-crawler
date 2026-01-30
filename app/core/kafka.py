import asyncio
import json

from aiokafka import AIOKafkaClient, AIOKafkaProducer
from aiokafka.errors import TopicAlreadyExistsError

TOPIC = "org_jobs"


class KafkaProducer:

    def __init__(self):
        self.producer = None
        self.admin = None

    async def start(self):
        while True:
            try:
                # admin client
                self.admin = AIOKafkaClient(bootstrap_servers="kafka:9092")
                await self.admin.start()

                # create topic if not exists
                try:
                    await self.admin.create_topics(
                        [{"topic": TOPIC, "num_partitions": 3, "replication_factor": 1}]
                    )
                    print("Topic created")
                except TopicAlreadyExistsError:
                    pass

                # producer
                self.producer = AIOKafkaProducer(bootstrap_servers="kafka:9092")
                await self.producer.start()

                print("Kafka connected")
                return

            except Exception:
                print("Kafka not ready, retrying...")
                await asyncio.sleep(3)

    async def stop(self):
        if self.producer:
            await self.producer.stop()
        if self.admin:
            await self.admin.close()

    async def send(self, topic: str, payload: dict):
        await self.producer.send_and_wait(topic, json.dumps(payload).encode())


producer = KafkaProducer()
