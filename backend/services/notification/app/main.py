import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .subscribers.alert_listener import run_subscriber

subscriber_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global subscriber_task
    print("Starting Notification Service...")
    subscriber_task = asyncio.create_task(run_subscriber())
    yield
    print("Shutting down Notification Service...")
    if subscriber_task:
        subscriber_task.cancel()
        try:
            await subscriber_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Notification Service", lifespan=lifespan)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "notification"}


@app.get("/metrics", response_class=PlainTextResponse, tags=["observability"])
async def metrics():
    return PlainTextResponse(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
