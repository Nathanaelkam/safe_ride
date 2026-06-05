import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse 
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
import redis.asyncio as aioredis
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("route_analysis.main")

# ----------------- Redis client -----------------
REDIS_URL = "redis://emergency-redis:6379/0"
redis = aioredis.from_url(REDIS_URL, decode_responses=True)

# ----------------- Minimal GPS consumer -----------------
async def consume_gps_updates():
    logger.info("Consumer started – listening on 'location_updates'")# pragma: no cover
    last_id = "0-0" # pragma: no cover
    while True: # pragma: no cover
        try: # pragma: no cover
            result = await redis.xread({"location_updates": last_id}, count=1, block=5000) # pragma: no cover
            if result: # pragma: no cover
                for stream, messages in result: # pragma: no cover
                    for msg_id, data in messages: # pragma: no cover
                        logger.info(f"GPS: {data}") # pragma: no cover
                        last_id = msg_id # pragma: no cover
            # else: no new messages (timeout) – silently continue # pragma: no cover
        except asyncio.CancelledError: # pragma: no cover
            logger.info("Consumer cancelled") # pragma: no cover
            raise # pragma: no cover
        except Exception as e: # pragma: no cover
            # Log only real errors, not timeouts # pragma: no cover
            if "Timeout" not in str(e): # pragma: no cover
                logger.error(f"Consumer error: {e}") # pragma: no cover
            # Still continue the loop 
            
# ----------------- Application lifespan -----------------
subscriber_task = None

@asynccontextmanager
async def lifespan(app: FastAPI): # pragma: no cover
    global subscriber_task # pragma: no cover
    subscriber_task = asyncio.create_task(consume_gps_updates())# pragma: no cover
    logger.info("Started background GPS consumer") # pragma: no cover
    yield # pragma: no cover
    if subscriber_task: # pragma: no cover
        subscriber_task.cancel() # pragma: no cover
        try: # pragma: no cover
            await subscriber_task # pragma: no cover
        except asyncio.CancelledError: # pragma: no cover
            pass # pragma: no cover

app = FastAPI(title="Seva Route Analysis Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],        
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "route_analysis"} # pragma: no cover

@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)