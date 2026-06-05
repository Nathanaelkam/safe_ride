from typing import Dict, Set    
from collections import defaultdict
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .models import Trip, TripStatus

class ConnectionManager:
    def __init__(self):
        # Cache: trip_id -> {"passenger_id": str, "websocket": WebSocket}
        self.active_trips: Dict[str, dict] = {}
        self.viewers: dict[str, set] = defaultdict(set)

    async def connect(self, trip_id: str, passenger_id: str, websocket: WebSocket, db: AsyncSession):
        result = await db.execute(select(Trip).where(Trip.id == trip_id))
        trip = result.scalars().first()
        if not trip:
            await websocket.close(code=4004, reason="Trip not found")
            return False
        if trip.status != TripStatus.ACTIVE:
            await websocket.close(code=4003, reason="Trip not active")
            return False
        if trip.passenger_id != passenger_id:
            await websocket.close(code=4001, reason="Not your trip")
            return False

        await websocket.accept()
        self.active_trips[trip_id] = {
            "passenger_id": passenger_id,
            "websocket": websocket,
        }
        return True

    def disconnect(self, trip_id: str):
        self.active_trips.pop(trip_id, None)

    def get_trip(self, trip_id: str) -> dict | None:
        return self.active_trips.get(trip_id)

    async def send_personal_message(self, message: dict, trip_id: str):
        conn = self.active_trips.get(trip_id)
        if conn:
            await conn["websocket"].send_json(message)
            
 # ---------- Viewer management ----------
    def add_viewer(self, trip_id: str, websocket: WebSocket):
        self.viewers[trip_id].add(websocket)

    def remove_viewer(self, trip_id: str, websocket: WebSocket):
        self.viewers[trip_id].discard(websocket)

    async def broadcast_to_viewers(self, trip_id: str, message: dict):
        """Send a JSON message to all viewers of a trip."""
        stale = set()
        for ws in self.viewers.get(trip_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                stale.add(ws)
        # Clean up any connections that failed
        self.viewers[trip_id] -= stale

 
manager = ConnectionManager()