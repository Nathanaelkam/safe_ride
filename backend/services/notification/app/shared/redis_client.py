import redis.asyncio as aioredis
import os

REDIS_URL = os.getenv("NOTIFICATION_REDIS_URL", "redis://localhost:6379/0")

async def get_redis():
    return aioredis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True) # pragma: no cover
