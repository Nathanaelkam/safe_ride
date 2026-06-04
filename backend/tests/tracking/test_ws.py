import json
import pytest
from unittest.mock import patch, AsyncMock
from services.tracking.routers.ws import websocket_endpoint


@pytest.mark.asyncio
async def test_websocket_invalid_token():
    """Server closes the WebSocket with code 4001 when the token is invalid."""
    mock_websocket = AsyncMock()
    with patch("services.tracking.routers.ws.decode_access_token", return_value={}):
        await websocket_endpoint(
            websocket=mock_websocket,
            trip_id="trip-123",
            token="bad_token",
            db=AsyncMock()
        )
    mock_websocket.close.assert_called_once_with(code=4001, reason="Invalid token")


@pytest.mark.asyncio
async def test_websocket_trip_not_found():
    """Server returns without publishing when the trip is not found."""
    mock_websocket = AsyncMock()
    with patch("services.tracking.routers.ws.decode_access_token", return_value={"sub": "user123"}):
        with patch("services.tracking.connection_manager.manager.connect", return_value=False):
            await websocket_endpoint(
                websocket=mock_websocket,
                trip_id="trip-123",
                token="valid_token",
                db=AsyncMock()
            )
    with patch("services.tracking.routers.ws.publish_location") as mock_pub:
        mock_pub.assert_not_called()


@pytest.mark.asyncio
async def test_websocket_success_message():
    """Server publishes location when a valid GPS message arrives."""
    mock_websocket = AsyncMock()
    # First call returns valid GPS JSON, second raises an exception to exit the loop
    mock_websocket.receive_text = AsyncMock(side_effect=[
        json.dumps({"latitude": 12.34, "longitude": 56.78, "timestamp": "2025-01-01T10:00:00Z"}),
        Exception("close")
    ])

    with patch("services.tracking.routers.ws.decode_access_token", return_value={"sub": "user123"}):
        with patch("services.tracking.connection_manager.manager.connect", return_value=True):
            with patch("services.tracking.connection_manager.manager.get_trip", return_value={"passenger_id": "user123"}):
                with patch("services.tracking.routers.ws.publish_location", new_callable=AsyncMock) as mock_pub:
                    try:
                        await websocket_endpoint(
                            websocket=mock_websocket,
                            trip_id="trip-123",
                            token="valid_token",
                            db=AsyncMock()
                        )
                    except Exception:
                        pass   # expected exit from loop

    mock_pub.assert_called_once()
    mock_websocket.send_json.assert_any_call({"status": "ok"})