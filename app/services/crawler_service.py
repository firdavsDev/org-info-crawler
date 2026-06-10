import json
import os
import subprocess
import tempfile

# Run Scrapy from the project root so crawler.* module paths resolve correctly
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


class CrawlerService:

    async def crawl(self, tin: str) -> dict:
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".json")
        tmp.close()

        # -t/--output-format was removed in Scrapy 2.1+; format is inferred from
        # the .json suffix on the output file.
        cmd = [
            "scrapy",
            "crawl",
            "orginfo",
            "-a",
            f"tin={tin}",
            "-O",
            tmp.name,
        ]

        env = os.environ.copy()
        env["SCRAPY_SETTINGS_MODULE"] = "crawler.settings"
        # Ensure the project root is on PYTHONPATH so `crawler` package is importable
        existing = env.get("PYTHONPATH", "")
        env["PYTHONPATH"] = f"{PROJECT_ROOT}:{existing}" if existing else PROJECT_ROOT

        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            env=env,
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"Scrapy exited {result.returncode}: {result.stderr[-2000:]}"
            )

        with open(tmp.name) as f:
            items = json.load(f)

        if not items:
            raise RuntimeError(f"Scrapy returned no items for TIN {tin}")

        return items[0]
