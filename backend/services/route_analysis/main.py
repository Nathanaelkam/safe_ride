import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import redis.asyncio as aioredis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("route_analysis.main")

# ----------------- Redis client -----------------
REDIS_URL = "redis://emergency-redis:6379/0"
redis = aioredis.from_url(REDIS_URL, decode_responses=True)

# ----------------- Minimal GPS consumer -----------------
async def consume_gps_updates():
    logger.info("Consumer started – listening on 'location_updates'")
    last_id = "0-0"
    while True:
        try:
            result = await redis.xread({"location_updates": last_id}, count=1, block=5000)
            if result:
                for stream, messages in result:
                    for msg_id, data in messages:
                        logger.info(f"GPS: {data}")
                        last_id = msg_id
            # else: no new messages (timeout) – silently continue
        except asyncio.CancelledError:
            logger.info("Consumer cancelled")
            raise
        except Exception as e:
            # Log only real errors, not timeouts
            if "Timeout" not in str(e):
                logger.error(f"Consumer error: {e}")
            # Still continue the loop
            
# ----------------- Application lifespan -----------------
subscriber_task = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global subscriber_task
    subscriber_task = asyncio.create_task(consume_gps_updates())
    logger.info("Started background GPS consumer")
    yield
    if subscriber_task:
        subscriber_task.cancel()
        try:
            await subscriber_task
        except asyncio.CancelledError:
            pass

app = FastAPI(title="Seva Route Analysis Service", version="1.0.0", lifespan=lifespan)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "route_analysis"}

@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)