import logging

from app.core.config import settings
from app.core.didox import DidoxError

logger = logging.getLogger(__name__)


class DidoxService:
    """Cache-aside access to Didox, plus bank-name enrichment for org info."""

    def __init__(self, client, cache):
        self.client = client
        self.cache = cache

    async def get_org(self, tin: str) -> dict:
        key = f"org:{tin}"
        cached = await self.cache.get(key)
        if cached is not None:
            return cached

        info = await self.client.get_info(tin)
        result = {"data": info, "bank_name": None}
        try:
            result["bank_name"] = await self._bank_name(info.get("bankCode") or info.get("mfo"))
        except DidoxError as exc:
            # A missing bank name must not fail the org lookup. Skip caching so
            # the next request retries the bank lookup.
            logger.warning("Could not resolve Didox bank for %s: %s", tin, exc.detail)
            return result

        await self.cache.set(key, result, ttl=settings.DIDOX_INFO_TTL_SECONDS)
        return result

    async def get_banks(self):
        return await self._cached("banks", settings.DIDOX_REFERENCE_TTL_SECONDS, self.client.get_banks)

    async def get_regions(self):
        return await self._cached("regions", settings.DIDOX_REFERENCE_TTL_SECONDS, self.client.get_regions)

    async def get_districts(self, region_id: int):
        return await self._cached(
            f"districts:{region_id}",
            settings.DIDOX_REFERENCE_TTL_SECONDS,
            lambda: self.client.get_districts(region_id),
        )

    async def _bank_name(self, bank_code) -> str | None:
        """Resolve an org's bankCode/mfo to a name via the cached bank list."""
        if not bank_code:
            return None
        banks = await self.get_banks()
        for bank in banks if isinstance(banks, list) else []:
            if isinstance(bank, dict) and str(bank.get("bankId")) == str(bank_code):
                return bank.get("name")
        return None

    async def _cached(self, key: str, ttl: int, fetch):
        cached = await self.cache.get(key)
        if cached is not None:
            return cached
        data = await fetch()
        # Empty answers are returned but never cached.
        if data:
            await self.cache.set(key, data, ttl=ttl)
        return data
