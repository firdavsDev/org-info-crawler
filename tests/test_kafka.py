import asyncio

import pytest

from app.core import kafka

REAL_SLEEP = asyncio.sleep


class FakeAdminWithoutCreateTopics:
    closed = False

    def __init__(self, bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers

    async def start(self):
        return None

    async def close(self):
        self.closed = True


class FakeProducer:
    started = False
    stopped = False

    def __init__(self, bootstrap_servers):
        self.bootstrap_servers = bootstrap_servers

    async def start(self):
        self.started = True

    async def stop(self):
        self.stopped = True

    async def send_and_wait(self, topic, payload):
        self.sent = (topic, payload)


async def fast_sleep(seconds):
    await REAL_SLEEP(0)


@pytest.mark.asyncio
async def test_start_does_not_loop_forever_when_admin_lacks_create_topics(monkeypatch):
    monkeypatch.setattr(kafka, "AIOKafkaClient", FakeAdminWithoutCreateTopics, raising=False)
    monkeypatch.setattr(kafka, "AIOKafkaProducer", FakeProducer)
    monkeypatch.setattr(kafka.asyncio, "sleep", fast_sleep)

    producer = kafka.KafkaProducer()

    await asyncio.wait_for(producer.start(), timeout=0.05)

    assert isinstance(producer.producer, FakeProducer)
    assert producer.producer.started is True
