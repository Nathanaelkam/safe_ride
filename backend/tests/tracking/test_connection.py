import pytest
from unittest.mock import AsyncMock, MagicMock
from services.tracking.connection_manager import ConnectionManager
from fastapi import WebSocket

@pytest.mark.asyncio
async def test_connect_fail_trip_not_found():
    mgr = ConnectionManager()
    websocket = AsyncMock(spec=WebSocket)
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=lambda: MagicMock(first=lambda: None)))
    result = await mgr.connect("some-id", "user-id", websocket, db)
    assert result is False
    websocket.close.assert_called_once_with(code=4004, reason="Trip not found")

@pytest.mark.asyncio
async def test_disconnect():
    mgr = ConnectionManager()
    mgr.active_trips["trip1"] = {"passenger_id": "u1", "websocket": AsyncMock()}
    mgr.disconnect("trip1")
    assert "trip1" not in mgr.active_trips

@pytest.mark.asyncio
async def test_get_trip():
    mgr = ConnectionManager()
    mgr.active_trips["trip1"] = {"passenger_id": "u1"}
    assert mgr.get_trip("trip1") is not None
    assert mgr.get_trip("nonexistent") is None

@pytest.mark.asyncio
async def test_connect_fail_trip_not_active():
    from services.tracking.models import Trip, TripStatus
    mgr = ConnectionManager()
    websocket = AsyncMock(spec=WebSocket)
    db = AsyncMock()
    # Simulate a trip that exists but is not ACTIVE
    trip = Trip(id="some-id", passenger_id="user-id", status=TripStatus.COMPLETED)
    db.execute = AsyncMock(return_value=MagicMock(
        scalars=lambda: MagicMock(first=lambda: trip)
    ))
    result = await mgr.connect("some-id", "user-id", websocket, db)
    assert result is False
    websocket.close.assert_called_once_with(code=4003, reason="Trip not active")

@pytest.mark.asyncio
async def test_get_db_dependency():
    from services.tracking.database import get_db
    gen = get_db()
    session = await gen.__anext__()
    assert session is not None