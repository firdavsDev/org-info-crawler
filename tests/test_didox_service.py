"""Unit tests for DidoxService: cache-aside, bank enrichment, and no caching of failures."""
import pytest

from app.core.config import settings
from app.core.didox import DidoxNotFound, DidoxUpstreamError
from app.services.didox_service import DidoxService

TIN = "304918546"
INFO = {"tin": TIN, "name": "EXAMPLE LLC", "bankCode": "00475", "mfo": "00475"}
BANKS = [{"bankId": "00001", "name": "Central Bank"}, {"bankId": "00475", "name": "Example Bank"}]


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class FakeCache:
    def __init__(self, data=None):
        self.data = dict(data or {})
        self.sets = []

    async def get(self, key):
        return self.data.get(key)

    async def set(self, key, payload, ttl):
        self.data[key] = payload
        self.sets.append((key, ttl))


class FakeClient:
    """Each value is either the response to return or an exception to raise."""

    def __init__(self, info=None, banks=None, regions=None, districts=None):
        self.responses = {
            "info": info if info is not None else dict(INFO),
            "banks": banks if banks is not None else list(BANKS),
            "regions": regions if regions is not None else [{"regionId": 3}],
            "districts": districts if districts is not None else [{"soato": 1703202}],
        }
        self.calls = []

    def _answer(self, name, *args):
        self.calls.append((name, *args))
        response = self.responses[name]
        if isinstance(response, Exception):
            raise response
        return response

    async def get_info(self, inn):
        return self._answer("info", inn)

    async def get_banks(self):
        return self._answer("banks")

    async def get_regions(self):
        return self._answer("regions")

    async def get_districts(self, region_id):
        return self._answer("districts", region_id)


# ---------------------------------------------------------------------------
# get_org
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_org_cache_hit_skips_client():
    cached = {"data": {"tin": TIN, "name": "CACHED LLC"}, "bank_name": "Cached Bank"}
    client = FakeClient()
    cache = FakeCache({f"org:{TIN}": cached})

    result = await DidoxService(client, cache).get_org(TIN)

    assert result == cached
    assert client.calls == []
    assert cache.sets == []


@pytest.mark.asyncio
async def test_org_cache_miss_fetches_enriches_and_caches():
    cache = FakeCache()
    client = FakeClient()

    result = await DidoxService(client, cache).get_org(TIN)

    assert result == {"data": INFO, "bank_name": "Example Bank"}
    assert client.calls == [("info", TIN), ("banks",)]
    assert (f"org:{TIN}", settings.DIDOX_INFO_TTL_SECONDS) in cache.sets
    assert ("banks", settings.DIDOX_REFERENCE_TTL_SECONDS) in cache.sets
    assert cache.data[f"org:{TIN}"] == result


@pytest.mark.asyncio
async def test_bank_name_falls_back_to_mfo():
    client = FakeClient(info={"tin": TIN, "name": "EXAMPLE LLC", "bankCode": "", "mfo": "00475"})

    result = await DidoxService(client, FakeCache()).get_org(TIN)

    assert result["bank_name"] == "Example Bank"


@pytest.mark.asyncio
async def test_bank_name_matches_across_str_and_int_codes():
    client = FakeClient(
        info={"tin": TIN, "name": "EXAMPLE LLC", "bankCode": 475},
        banks=[{"bankId": "475", "name": "Example Bank"}],
    )

    result = await DidoxService(client, FakeCache()).get_org(TIN)

    assert result["bank_name"] == "Example Bank"


@pytest.mark.asyncio
async def test_bank_name_is_none_without_bank_code():
    client = FakeClient(info={"tin": TIN, "name": "EXAMPLE LLC", "bankCode": "", "mfo": None})

    result = await DidoxService(client, FakeCache()).get_org(TIN)

    assert result["bank_name"] is None
    assert ("banks",) not in client.calls


@pytest.mark.asyncio
async def test_bank_name_is_none_for_unknown_bank():
    client = FakeClient(info={"tin": TIN, "name": "EXAMPLE LLC", "bankCode": "99999"})

    result = await DidoxService(client, FakeCache()).get_org(TIN)

    assert result["bank_name"] is None


@pytest.mark.asyncio
async def test_bank_lookup_failure_returns_org_without_caching_it():
    # Not caching lets the bank name be retried on the next request.
    client = FakeClient(banks=DidoxUpstreamError())
    cache = FakeCache()

    result = await DidoxService(client, cache).get_org(TIN)

    assert result == {"data": INFO, "bank_name": None}
    assert cache.sets == []


@pytest.mark.asyncio
async def test_not_found_is_raised_and_not_cached():
    cache = FakeCache()
    client = FakeClient(info=DidoxNotFound())

    with pytest.raises(DidoxNotFound):
        await DidoxService(client, cache).get_org("999999999")
    assert cache.sets == []


# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_regions_are_cached_with_reference_ttl():
    cache = FakeCache()

    assert await DidoxService(FakeClient(), cache).get_regions() == [{"regionId": 3}]
    assert cache.sets == [("regions", settings.DIDOX_REFERENCE_TTL_SECONDS)]


@pytest.mark.asyncio
async def test_districts_are_cached_per_region():
    cache = FakeCache()
    client = FakeClient()

    assert await DidoxService(client, cache).get_districts(3) == [{"soato": 1703202}]
    assert client.calls == [("districts", 3)]
    assert cache.sets == [("districts:3", settings.DIDOX_REFERENCE_TTL_SECONDS)]


@pytest.mark.asyncio
async def test_empty_districts_are_returned_but_not_cached():
    cache = FakeCache()

    assert await DidoxService(FakeClient(districts=[]), cache).get_districts(999999) == []
    assert cache.sets == []


@pytest.mark.asyncio
async def test_banks_cache_hit_skips_client():
    client = FakeClient()
    cache = FakeCache({"banks": [{"bankId": "00001", "name": "Cached"}]})

    assert await DidoxService(client, cache).get_banks() == [{"bankId": "00001", "name": "Cached"}]
    assert client.calls == []
