"""Unit tests for OrgService: cache-hit, first-fetch, failed-retry, dedup."""
import types

import pytest

from app.models.organization import JobStatus
from app.services.org_service import OrgService


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class FakeProducer:
    def __init__(self):
        self.sent = []

    async def send(self, topic, data):
        self.sent.append((topic, data))


class FakeRepo:
    def __init__(self, existing=None, created=False):
        self._obj = existing
        self._created = created
        self.status_updates = []

    async def get_or_create_job(self, tin):
        return self._obj, self._created

    async def set_status(self, tin, status):
        if self._obj:
            self._obj.status = status
        self.status_updates.append((tin, status))


def _org(status: JobStatus, payload=None, crawled_at=None):
    from datetime import datetime
    return types.SimpleNamespace(
        tin="123456789",
        status=status,
        payload=payload or {},
        error=None,
        crawled_at=crawled_at if crawled_at is not None else datetime.utcnow(),
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_service(existing=None, created=False):
    repo = FakeRepo(existing=existing, created=created)
    producer = FakeProducer()
    service = OrgService(repo)
    # Patch the module-level producer used by OrgService
    import app.services.org_service as mod
    mod.producer = producer
    return service, repo, producer


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ready_org_returns_data():
    org = _org(JobStatus.ready, payload={"name": "Acme"})
    service, _, producer = _make_service(existing=org, created=False)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "ready"
    assert result["data"] == {"name": "Acme"}
    assert producer.sent == []


@pytest.mark.asyncio
async def test_first_request_queues_job():
    org = _org(JobStatus.queued)
    service, _, producer = _make_service(existing=org, created=True)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "queued"
    assert len(producer.sent) == 1
    assert producer.sent[0] == ("org_jobs", {"tin": "123456789"})


@pytest.mark.asyncio
async def test_already_queued_no_duplicate_message():
    org = _org(JobStatus.queued)
    service, _, producer = _make_service(existing=org, created=False)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "queued"
    assert producer.sent == []


@pytest.mark.asyncio
async def test_already_processing_no_duplicate_message():
    org = _org(JobStatus.processing)
    service, _, producer = _make_service(existing=org, created=False)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "processing"
    assert producer.sent == []


@pytest.mark.asyncio
async def test_failed_job_is_requeued():
    org = _org(JobStatus.failed)
    org.error = "Timeout"
    service, repo, producer = _make_service(existing=org, created=False)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "queued"
    assert ("123456789", JobStatus.queued) in repo.status_updates
    assert len(producer.sent) == 1
    assert producer.sent[0] == ("org_jobs", {"tin": "123456789"})


@pytest.mark.asyncio
async def test_expired_ready_org_is_requeued():
    from datetime import datetime, timedelta
    old_ts = datetime.utcnow() - timedelta(days=60)
    org = _org(JobStatus.ready, payload={"name": "Acme"}, crawled_at=old_ts)
    service, repo, producer = _make_service(existing=org, created=False)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "queued"
    assert len(producer.sent) == 1


@pytest.mark.asyncio
async def test_fresh_ready_org_not_requeued():
    from datetime import datetime
    org = _org(JobStatus.ready, payload={"name": "Acme"}, crawled_at=datetime.utcnow())
    service, _, producer = _make_service(existing=org, created=False)

    result = await service.get_or_fetch("123456789")

    assert result["status"] == "ready"
    assert producer.sent == []
