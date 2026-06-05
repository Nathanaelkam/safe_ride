import redis.asyncio as aioredis
from .config import settings

redis = aioredis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)


async def publish_location(trip_id: str, passenger_id: str, latitude: float, longitude: float, timestamp: str):
    """Publish a GPS coordinate to the location_updates Redis stream."""
    data = {
        "trip_id": trip_id,
        "passenger_id": passenger_id,
        "latitude": str(latitude),
        "longitude": str(longitude),
        "timestamp": timestamp,
    }
    await redis.xadd("location_updates", data, maxlen=10000)