import pytest
from unittest.mock import AsyncMock, patch
from services.tracking.redis_client import publish_location

@pytest.mark.asyncio
async def test_publish_location():
    mock_redis = AsyncMock()
    with patch("services.tracking.redis_client.redis", mock_redis):
        await publish_location(
            trip_id="trip-1",
            passenger_id="user-1",
            latitude=12.34,
            longitude=56.78,
            timestamp="2025-01-01T10:00:00Z"
        )
    mock_redis.xadd.assert_called_once_with(
        "location_updates",
        {
            "trip_id": "trip-1",
            "passenger_id": "user-1",
            "latitude": "12.34",
            "longitude": "56.78",
            "timestamp": "2025-01-01T10:00:00Z"
        },
        maxlen=10000
    )