from fastapi import FastAPI

from app.api.routes import router

app = FastAPI()

app.include_router(router)

from app.core.kafka import producer


@app.on_event("startup")
async def startup():
    await producer.start()


@app.on_event("shutdown")
async def shutdown():
    await producer.stop()
