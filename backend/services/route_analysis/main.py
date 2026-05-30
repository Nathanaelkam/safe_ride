import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from .app.database import engine, Base
from .app.events.subscriber import consume_gps_updates

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("route_analysis.main")

# Background task reference
subscriber_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB (for demo purposes)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    global subscriber_task
    subscriber_task = asyncio.create_task(consume_gps_updates())
    logger.info("Started background task: consume_gps_updates")
    
    yield
    
    logger.info("Shutting down background task")
    if subscriber_task:
        subscriber_task.cancel()
        try:
            await subscriber_task
        except asyncio.CancelledError:
            pass

app = FastAPI(
    title="Seva Route Analysis Service",
    lifespan=lifespan
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "route_analysis"}


@app.get("/metrics", response_class=PlainTextResponse, tags=["observability"])
async def metrics():
    return PlainTextResponse(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
