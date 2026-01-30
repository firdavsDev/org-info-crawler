import json
import subprocess
import tempfile


class CrawlerService:

    async def crawl(self, tin: str) -> dict:
        tmp = tempfile.NamedTemporaryFile(delete=False)

        cmd = [
            "scrapy",
            "crawl",
            "orginfo",
            "-a",
            f"tin={tin}",
            "-O",
            tmp.name,
            "-t",
            "json",
        ]

        subprocess.run(cmd, check=True)

        with open(tmp.name) as f:
            return json.load(f)[0]
