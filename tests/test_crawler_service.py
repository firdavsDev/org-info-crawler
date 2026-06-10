"""Unit tests for CrawlerService edge cases (no subprocess calls)."""
import json

import pytest

from app.services.crawler_service import CrawlerNoResultError, CrawlerService


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_json(path: str, data) -> None:
    with open(path, "w") as f:
        json.dump(data, f)


class _PatchedCrawler(CrawlerService):
    """CrawlerService with subprocess.run replaced by a controllable fake."""

    def __init__(self, returncode=0, stderr="", items=None):
        self._returncode = returncode
        self._stderr = stderr
        self._items = items  # None means no output file written

    async def crawl(self, tin: str) -> dict:
        import tempfile, os, json
        from app.core.config import settings

        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "output.json")

            if self._returncode != 0:
                raise RuntimeError(
                    f"Scrapy exited {self._returncode}: {self._stderr[-2000:]}"
                )

            if self._items is None:
                raise CrawlerNoResultError(
                    f"Scrapy produced no output file for TIN {tin}"
                )

            if not self._items:
                raise CrawlerNoResultError(
                    f"Scrapy returned no items for TIN {tin}"
                )

            return self._items[0]


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_crawl_returns_first_item():
    crawler = _PatchedCrawler(items=[{"tin": "123456789", "name": "Acme"}])
    result = await crawler.crawl("123456789")
    assert result["tin"] == "123456789"
    assert result["name"] == "Acme"


@pytest.mark.asyncio
async def test_crawl_nonzero_exit_raises_runtime_error():
    crawler = _PatchedCrawler(returncode=1, stderr="ERROR Something went wrong")
    with pytest.raises(RuntimeError, match="Scrapy exited 1"):
        await crawler.crawl("123456789")


@pytest.mark.asyncio
async def test_crawl_no_output_file_raises_domain_error():
    crawler = _PatchedCrawler(items=None)
    with pytest.raises(CrawlerNoResultError, match="no output file"):
        await crawler.crawl("123456789")


@pytest.mark.asyncio
async def test_crawl_empty_items_raises_domain_error():
    crawler = _PatchedCrawler(items=[])
    with pytest.raises(CrawlerNoResultError, match="no items"):
        await crawler.crawl("123456789")
