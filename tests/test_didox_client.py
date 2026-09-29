"""Unit tests for DidoxClient: upstream URLs, partner header, and error mapping."""
import httpx
import pytest

from app.core.config import settings
from app.core.didox import (
    DidoxClient,
    DidoxNotConfigured,
    DidoxNotFound,
    DidoxTimeout,
    DidoxUpstreamError,
)

BASE = "https://didox.test/v1"
TOKEN = "partner-secret"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def didox_settings(monkeypatch):
    # Trailing slash on purpose: it must not produce a double slash in URLs.
    monkeypatch.setattr(settings, "DIDOX_BASE_URL", BASE + "/")
    monkeypatch.setattr(settings, "PARTNER_AUTHORIZATION", TOKEN)


def _client(handler):
    """Return a DidoxClient backed by a mock transport, plus the list of sent requests."""
    sent = []

    def record(request):
        sent.append(request)
        return handler(request)

    http = httpx.AsyncClient(transport=httpx.MockTransport(record))
    return DidoxClient(http=http), sent


def _respond(status=200, **kwargs):
    return lambda request: httpx.Response(status, **kwargs)


# ---------------------------------------------------------------------------
# URLs and headers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_info_uses_info_url_and_partner_header():
    record = {"tin": "304918546", "name": "EXAMPLE LLC", "bankCode": "00475"}
    client, sent = _client(_respond(json=record))

    data = await client.get_info("304918546")

    assert data == record
    assert str(sent[0].url) == f"{BASE}/utils/info/304918546/"
    assert sent[0].headers["Partner-Authorization"] == TOKEN


@pytest.mark.asyncio
async def test_get_banks_uses_banks_url_without_partner_header():
    client, sent = _client(_respond(json=[{"bankId": 7, "name": "Bank"}]))

    data = await client.get_banks()

    assert data == [{"bankId": 7, "name": "Bank"}]
    assert str(sent[0].url) == f"{BASE}/banks/all/"
    assert "Partner-Authorization" not in sent[0].headers


@pytest.mark.asyncio
async def test_get_regions_uses_regions_url_and_partner_header():
    client, sent = _client(_respond(json=[{"id": 1}]))

    data = await client.get_regions()

    assert data == [{"id": 1}]
    assert str(sent[0].url) == f"{BASE}/utils/waybills/regions/"
    assert sent[0].headers["Partner-Authorization"] == TOKEN


@pytest.mark.asyncio
async def test_get_districts_passes_region_id_without_trailing_slash():
    client, sent = _client(_respond(json=[{"id": 10}]))

    data = await client.get_districts(5)

    assert data == [{"id": 10}]
    assert str(sent[0].url) == f"{BASE}/utils/waybills/districts?regionId=5"
    assert sent[0].headers["Partner-Authorization"] == TOKEN


@pytest.mark.asyncio
async def test_empty_list_is_returned_as_is():
    client, _ = _client(_respond(json=[]))

    assert await client.get_districts(99) == []


# ---------------------------------------------------------------------------
# Error mapping
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "handler",
    [
        _respond(404),
        _respond(json={}),
        _respond(json=None),
        _respond(content=b""),
        # What Didox actually returns for an unknown TIN: HTTP 200, every field empty.
        _respond(json={"tin": "", "name": None, "shortName": "", "fullName": "", "personalNum": None, "isBudget": 0}),
    ],
    ids=["404", "empty-object", "null", "empty-body", "empty-record"],
)
async def test_unknown_inn_raises_not_found(handler):
    client, _ = _client(handler)

    with pytest.raises(DidoxNotFound):
        await client.get_info("999999999")


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "handler", [_respond(404), _respond(content=b"")], ids=["404", "empty-body"]
)
async def test_missing_reference_data_raises_upstream_error(handler):
    # A 404 on a list endpoint means a wrong base URL/path, not "no banks".
    client, _ = _client(handler)

    with pytest.raises(DidoxUpstreamError):
        await client.get_regions()


@pytest.mark.asyncio
@pytest.mark.parametrize("status", [301, 400, 401, 403, 500, 503])
async def test_error_status_raises_upstream_error(status):
    client, _ = _client(_respond(status, json={"error": "nope"}))

    with pytest.raises(DidoxUpstreamError):
        await client.get_info("304918546")


@pytest.mark.asyncio
async def test_non_object_info_raises_upstream_error():
    client, _ = _client(_respond(json=["unexpected"]))

    with pytest.raises(DidoxUpstreamError):
        await client.get_info("304918546")


@pytest.mark.asyncio
async def test_non_json_body_raises_upstream_error():
    client, _ = _client(_respond(content=b"<html>maintenance</html>"))

    with pytest.raises(DidoxUpstreamError):
        await client.get_regions()


@pytest.mark.asyncio
async def test_timeout_raises_didox_timeout():
    def handler(request):
        raise httpx.ReadTimeout("timed out", request=request)

    client, _ = _client(handler)

    with pytest.raises(DidoxTimeout):
        await client.get_info("304918546")


@pytest.mark.asyncio
async def test_network_error_raises_upstream_error():
    def handler(request):
        raise httpx.ConnectError("connection refused", request=request)

    client, _ = _client(handler)

    with pytest.raises(DidoxUpstreamError):
        await client.get_banks()


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_missing_base_url_raises_not_configured(monkeypatch):
    monkeypatch.setattr(settings, "DIDOX_BASE_URL", "")
    client, sent = _client(_respond(json=[]))

    with pytest.raises(DidoxNotConfigured):
        await client.get_banks()
    assert sent == []


@pytest.mark.asyncio
async def test_missing_token_blocks_partner_calls_only(monkeypatch):
    monkeypatch.setattr(settings, "PARTNER_AUTHORIZATION", "")
    client, sent = _client(_respond(json=[{"bankId": 7}]))

    with pytest.raises(DidoxNotConfigured):
        await client.get_info("304918546")
    assert sent == []

    # /banks/all/ never sends the partner token, so it still works.
    assert await client.get_banks() == [{"bankId": 7}]


def test_error_details_are_client_safe():
    assert DidoxNotConfigured().status_code == 503
    assert DidoxNotFound().status_code == 404
    assert DidoxUpstreamError().status_code == 502
    assert DidoxTimeout().status_code == 504
    assert TOKEN not in DidoxUpstreamError().detail
