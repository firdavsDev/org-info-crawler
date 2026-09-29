"""Route tests for /didox/*: response envelope, validation, auth, and error mapping."""
import types

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.didox_routes import didox_error_handler, get_didox_service, router
from app.core.didox import (
    DidoxError,
    DidoxNotConfigured,
    DidoxNotFound,
    DidoxTimeout,
    DidoxUpstreamError,
)
from app.core.security import basic_auth


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class FakeService:
    def __init__(self, error=None):
        self.error = error

    async def get_org(self, tin):
        if self.error:
            raise self.error
        return {"data": {"tin": tin, "name": "EXAMPLE LLC"}, "bank_name": "Example Bank"}

    async def get_banks(self):
        return [{"bankId": 7, "name": "Example Bank"}]

    async def get_regions(self):
        return [{"id": 1}]

    async def get_districts(self, region_id):
        return [{"id": 10, "regionId": region_id}]


def _client(service=None, authenticated=True):
    app = FastAPI()
    app.include_router(router)
    app.add_exception_handler(DidoxError, didox_error_handler)
    app.dependency_overrides[get_didox_service] = lambda: service or FakeService()
    if authenticated:
        app.dependency_overrides[basic_auth] = lambda: types.SimpleNamespace(username="tester")
    return TestClient(app)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_org_returns_data_bank_name_and_meta():
    res = _client().get("/didox/org/304918546")

    assert res.status_code == 200
    body = res.json()
    assert body["data"] == {"tin": "304918546", "name": "EXAMPLE LLC"}
    assert body["bank_name"] == "Example Bank"
    assert set(body["_meta"]) == {"request_id", "elapsed_ms"}


def test_org_rejects_invalid_tin():
    res = _client().get("/didox/org/abc")

    assert res.status_code == 422
    assert res.json() == {"detail": "Invalid TIN: must be 9–14 digits."}


def test_org_requires_auth():
    res = _client(authenticated=False).get("/didox/org/304918546")

    assert res.status_code == 401


@pytest.mark.parametrize(
    "error, status",
    [
        (DidoxNotFound(), 404),
        (DidoxUpstreamError(), 502),
        (DidoxNotConfigured(), 503),
        (DidoxTimeout(), 504),
    ],
)
def test_didox_errors_map_to_status_and_detail(error, status):
    res = _client(FakeService(error=error)).get("/didox/org/304918546")

    assert res.status_code == status
    assert res.json() == {"detail": error.detail}


def test_banks_returns_data_envelope():
    body = _client().get("/didox/banks").json()

    assert body["data"] == [{"bankId": 7, "name": "Example Bank"}]
    assert "_meta" in body


def test_regions_returns_data_envelope():
    body = _client().get("/didox/regions").json()

    assert body["data"] == [{"id": 1}]
    assert "_meta" in body


def test_districts_passes_integer_region_id():
    body = _client().get("/didox/regions/5/districts").json()

    assert body["data"] == [{"id": 10, "regionId": 5}]


def test_districts_rejects_non_integer_region_id():
    res = _client().get("/didox/regions/abc/districts")

    assert res.status_code == 422
