from app.core.logging import configure_logging

configure_logging()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.didox_routes import didox_error_handler
from app.api.didox_routes import router as didox_router
from app.api.routes import router
from app.core.cache import cache, didox_cache
from app.core.config import settings
from app.core.didox import DidoxError, didox_client
from app.core.kafka import producer
from app.core.middleware import RequestContextMiddleware

app = FastAPI(
    title="OrgInfo Crawler API",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "org-info",
            "description": "Organization records crawled from orginfo.uz, plus auth check and search history.",
        },
        {
            "name": "didox",
            "description": "Didox partner API gateway: org info by TIN/PINFL, banks, regions, districts.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{settings.FRONTEND_PORT}",
        "http://localhost",
        "http://frontend",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(RequestContextMiddleware)
app.include_router(router)
app.include_router(didox_router)
app.add_exception_handler(DidoxError, didox_error_handler)


@app.on_event("startup")
async def startup():
    await producer.start()


@app.on_event("shutdown")
async def shutdown():
    await producer.stop()
    await cache.close()
    await didox_client.close()
    await didox_cache.close()
