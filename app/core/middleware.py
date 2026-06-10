"""ASGI middleware: attach a unique request-id and measure processing time."""
import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger(__name__)

REQUEST_ID_HEADER = "X-Request-ID"


class RequestContextMiddleware(BaseHTTPMiddleware):
    """
    For every request:
      - Generate (or propagate) a UUID4 request-id.
      - Store it on request.state.request_id.
      - Measure wall-clock processing time in milliseconds.
      - Store it on request.state.elapsed_ms after the response is built.
      - Attach X-Request-ID and X-Process-Time-Ms response headers.
      - Emit an INFO log line with method, path, status, and timing.
    """

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id

        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        request.state.elapsed_ms = elapsed_ms

        response.headers[REQUEST_ID_HEADER] = request_id
        response.headers["X-Process-Time-Ms"] = str(elapsed_ms)

        logger.info(
            "%s %s → %s  (%.2f ms)  req_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            request_id,
        )

        return response
