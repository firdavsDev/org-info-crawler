"""
Thin async Redis cache wrapper.

Usage:
    from app.core.cache import cache

    await cache.get("key")               # returns dict | None
    await cache.set("key", data, ttl=86400)
    await cache.delete("key")
    await cache.close()                  # on shutdown

    await didox_cache.get("regions")     # same API, "didox:" key prefix
"""
import json
import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

# Key prefix keeps org payloads namespaced
_PREFIX = "orginfo:org:"

# Default TTL mirrors CACHE_TTL_DAYS converted to seconds (min 1 day)
_DEFAULT_TTL = max(settings.CACHE_TTL_DAYS, 1) * 86_400


class _RedisCache:
    def __init__(self, prefix: str = _PREFIX) -> None:
        self._prefix = prefix
        self._client: aioredis.Redis | None = None

    def _get_client(self) -> aioredis.Redis:
        if self._client is None:
            self._client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    async def get(self, key: str) -> dict | list | None:
        try:
            raw = await self._get_client().get(f"{self._prefix}{key}")
            return json.loads(raw) if raw else None
        except Exception as exc:
            logger.warning("Redis GET failed for %s%s: %s", self._prefix, key, exc)
            return None

    async def set(self, key: str, payload: dict | list, ttl: int = _DEFAULT_TTL) -> None:
        try:
            await self._get_client().set(
                f"{self._prefix}{key}",
                json.dumps(payload, ensure_ascii=False),
                ex=ttl,
            )
        except Exception as exc:
            logger.warning("Redis SET failed for %s%s: %s", self._prefix, key, exc)

    async def delete(self, key: str) -> None:
        try:
            await self._get_client().delete(f"{self._prefix}{key}")
        except Exception as exc:
            logger.warning("Redis DELETE failed for %s%s: %s", self._prefix, key, exc)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None


cache = _RedisCache()
didox_cache = _RedisCache(prefix="didox:")
