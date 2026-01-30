import random

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Mozilla/5.0 (X11; Linux x86_64)",
]


class RotateUserAgentMiddleware:

    def process_request(self, request, spider):
        request.headers["User-Agent"] = random.choice(USER_AGENTS)
