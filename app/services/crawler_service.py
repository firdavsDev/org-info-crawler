import json
import logging
import os
import subprocess
import tempfile

from app.core.config import settings

logger = logging.getLogger(__name__)

# Run Scrapy from the project root so crawler.* module paths resolve correctly
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class CrawlerNoResultError(Exception):
    """Raised when Scrapy completes successfully but returns no items."""


class CrawlerService:

    async def crawl(self, tin: str) -> dict:
        with tempfile.TemporaryDirectory() as tmpdir:
            output_file = os.path.join(tmpdir, "output.json")

            # -t/--output-format was removed in Scrapy 2.1+; format is inferred
            # from the .json suffix on the output file.
            cmd = [
                "scrapy",
                "crawl",
                "orginfo",
                "-a",
                f"tin={tin}",
                "-O",
                output_file,
            ]

            env = os.environ.copy()
            env["SCRAPY_SETTINGS_MODULE"] = "crawler.settings"
            existing = env.get("PYTHONPATH", "")
            env["PYTHONPATH"] = (
                f"{PROJECT_ROOT}:{existing}" if existing else PROJECT_ROOT
            )

            try:
                result = subprocess.run(
                    cmd,
                    cwd=PROJECT_ROOT,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=settings.CRAWLER_TIMEOUT_SECONDS,
                )
            except subprocess.TimeoutExpired as exc:
                raise RuntimeError(
                    f"Scrapy timed out after {settings.CRAWLER_TIMEOUT_SECONDS}s"
                ) from exc

            if result.stdout:
                logger.debug("scrapy stdout: %s", result.stdout[-2000:])
            if result.stderr:
                logger.debug("scrapy stderr: %s", result.stderr[-2000:])

            if result.returncode != 0:
                raise RuntimeError(
                    f"Scrapy exited {result.returncode}: {result.stderr[-2000:]}"
                )

            if not os.path.exists(output_file):
                raise CrawlerNoResultError(
                    f"Scrapy produced no output file for TIN {tin}"
                )

            with open(output_file) as f:
                items = json.load(f)

            if not items:
                raise CrawlerNoResultError(
                    f"Scrapy returned no items for TIN {tin}"
                )

            return items[0]
