"""
Async client for the Didox partner API.

Usage:
    from app.core.didox import didox_client

    await didox_client.get_info("304918546")   # dict (TIN/INN or PINFL)
    await didox_client.get_banks()             # all banks
    await didox_client.get_regions()           # waybill regions
    await didox_client.get_districts(1)        # waybill districts of a region
    await didox_client.close()                 # on shutdown

Every failure is raised as a DidoxError subclass carrying the HTTP status and
client-safe detail the API should answer with.
"""
import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Didox answers an unknown TIN with HTTP 200 and a record whose fields are all
# empty, so a real record must have at least one of these filled in.
_IDENTITY_FIELDS = ("tin", "personalNum", "name", "fullName", "shortName")


class DidoxError(Exception):
    status_code = 502
    detail = "Didox request failed."

    def __init__(self, detail: str | None = None) -> None:
        if detail:
            self.detail = detail
        super().__init__(self.detail)


class DidoxNotConfigured(DidoxError):
    status_code = 503
    detail = "Didox integration is not configured."


class DidoxNotFound(DidoxError):
    status_code = 404
    detail = "Organization not found in Didox."


class DidoxUpstreamError(DidoxError):
    status_code = 502
    detail = "Didox returned an unexpected response."


class DidoxTimeout(DidoxError):
    status_code = 504
    detail = "Didox did not respond in time."


class DidoxClient:
    def __init__(self, http: httpx.AsyncClient | None = None) -> None:
        self._http = http

    def _get_http(self) -> httpx.AsyncClient:
        if self._http is None:
            self._http = httpx.AsyncClient(timeout=settings.DIDOX_TIMEOUT_SECONDS)
        return self._http

    async def get_info(self, inn: str) -> dict:
        data = await self._get(f"/utils/info/{inn}/")
        if not data:
            raise DidoxNotFound()
        if not isinstance(data, dict):
            logger.warning("Didox info for %s is a %s, not an object", inn, type(data).__name__)
            raise DidoxUpstreamError()
        if not any(data.get(field) for field in _IDENTITY_FIELDS):
            raise DidoxNotFound()
        return data

    async def get_banks(self) -> list:
        # The legacy client calls this endpoint without the partner token.
        return await self._get_required("/banks/all/", partner_auth=False)

    async def get_regions(self) -> list:
        return await self._get_required("/utils/waybills/regions/")

    async def get_districts(self, region_id: int) -> list:
        return await self._get_required(
            "/utils/waybills/districts", params={"regionId": region_id}
        )

    async def close(self) -> None:
        if self._http is not None:
            await self._http.aclose()
            self._http = None

    async def _get_required(self, path: str, params: dict | None = None, partner_auth: bool = True):
        data = await self._get(path, params=params, partner_auth=partner_auth)
        # Reference data always exists; a 404 here means a wrong base URL or path.
        if data is None:
            logger.warning("Didox GET %s returned nothing; check DIDOX_BASE_URL", path)
            raise DidoxUpstreamError()
        return data

    async def _get(self, path: str, params: dict | None = None, partner_auth: bool = True):
        """GET a Didox path; return parsed JSON, or None for 404 / empty body."""
        base_url = settings.DIDOX_BASE_URL.rstrip("/")
        token = settings.PARTNER_AUTHORIZATION
        if not base_url or (partner_auth and not token):
            raise DidoxNotConfigured()

        headers = {"Content-Type": "application/json"}
        if partner_auth:
            headers["Partner-Authorization"] = token

        try:
            response = await self._get_http().get(f"{base_url}{path}", params=params, headers=headers)
        except httpx.TimeoutException as exc:
            logger.warning("Didox GET %s timed out: %s", path, type(exc).__name__)
            raise DidoxTimeout() from exc
        except httpx.HTTPError as exc:
            logger.warning("Didox GET %s failed: %s", path, type(exc).__name__)
            raise DidoxUpstreamError() from exc

        status = response.status_code
        if status == 404:
            logger.info("Didox GET %s → 404", path)
            return None
        if status in (401, 403):
            logger.error("Didox GET %s → %s; check PARTNER_AUTHORIZATION", path, status)
            raise DidoxUpstreamError()
        if not response.is_success:
            logger.warning("Didox GET %s → %s", path, status)
            raise DidoxUpstreamError()
        if not response.content.strip():
            return None

        try:
            return response.json()
        except ValueError as exc:
            logger.warning("Didox GET %s returned a non-JSON body", path)
            raise DidoxUpstreamError() from exc


didox_client = DidoxClient()
