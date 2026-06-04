from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..connection_manager import manager
from ..auth_utils import decode_access_token
from ..schemas import LocationMessage
from ..redis_client import publish_location
from ..metrics import inc_websocket_message
import json

router = APIRouter()


@router.websocket("/ws/tracking/{trip_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    trip_id: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Authenticate
    payload = decode_access_token(token)
    passenger_id = payload.get("sub")
    if not passenger_id:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Validate trip and cache connection
    success = await manager.connect(trip_id, passenger_id, websocket, db)
    if not success:
        return  # connection already closed with error

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
                location = LocationMessage(**data)
            except Exception:
                await websocket.send_json({"error": "Invalid message format"})
                continue

            # Quick cache check (optional, already validated on connect)
            if not manager.get_trip(trip_id):
                await websocket.close(code=4004, reason="Trip no longer active")
                return

            # Publish to Redis
            await publish_location(
                trip_id=trip_id,
                passenger_id=passenger_id,
                latitude=location.latitude,
                longitude=location.longitude,
                timestamp=location.timestamp.isoformat(),
            )

            inc_websocket_message()

            # Acknowledge (optional)
            await websocket.send_json({"status": "ok"})

    except WebSocketDisconnect:
        manager.disconnect(trip_id)