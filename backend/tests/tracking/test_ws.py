import json
import pytest
from fastapi.testclient import TestClient
from starlette.testclient import WebSocketDisconnect
from unittest.mock import patch, AsyncMock
from services.tracking.main import app
from services.tracking.connection_manager import manager
from services.auth.auth_utils import create_access_token

async def mock_connect(trip_id, passenger_id, websocket, db):
    await websocket.accept()
    manager.active_trips[trip_id] = {"passenger_id": passenger_id, "websocket": websocket}
    return True

def create_token(user_id="11111111-1111-1111-1111-111111111111"):
    return create_access_token({"sub": user_id})

client = TestClient(app)

@patch("services.tracking.routers.ws.publish_location", new_callable=AsyncMock)
@patch("services.tracking.connection_manager.manager.connect", side_effect=mock_connect)
def test_websocket_connect_and_send(mock_connect, mock_pub):
    token = create_token()
    trip_id = "11111111-1111-1111-1111-111111111111"

    with client.websocket_connect(f"/ws/tracking/{trip_id}?token={token}") as websocket:
        msg = {"latitude": 12.34, "longitude": 56.78, "timestamp": "2025-01-01T10:00:00Z"}
        websocket.send_text(json.dumps(msg))
        ack = websocket.receive_text()
        data = json.loads(ack)
        assert data == {"status": "ok"}
        mock_pub.assert_called_once()

@patch("services.tracking.connection_manager.manager.connect", return_value=False)
def test_websocket_invalid_token(mock_connect):
    token = create_token()
    trip_id = "11111111-1111-1111-1111-111111111111"

    # The server closes the connection without accepting -> WebSocketDisconnect
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/tracking/{trip_id}?token=bad_token") as websocket:
            websocket.receive_text()

@patch("services.tracking.routers.ws.publish_location", new_callable=AsyncMock)
@patch("services.tracking.connection_manager.manager.connect", return_value=False)
def test_websocket_trip_not_found(mock_connect, mock_pub):
    token = create_token()
    trip_id = "00000000-0000-0000-0000-000000000000"

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect(f"/ws/tracking/{trip_id}?token={token}") as websocket:
            websocket.receive_text()
    mock_pub.assert_not_called()