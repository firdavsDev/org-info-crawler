from app.core.logging import configure_logging

configure_logging()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.cache import cache
from app.core.kafka import producer
from app.core.middleware import RequestContextMiddleware

app = FastAPI(title="OrgInfo Crawler API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost",
        "http://frontend",
    ],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.add_middleware(RequestContextMiddleware)
app.include_router(router)


@app.on_event("startup")
async def startup():
    await producer.start()


@app.on_event("shutdown")
async def shutdown():
    await producer.stop()
    await cache.close()
