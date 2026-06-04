import asyncio
import websockets
import json

TRACKING_URL = "ws://localhost:8002/ws/tracking/"
TRIP_ID = "2b80cb9f-f402-4cf0-b129-9d204ece6c86"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzODVjY2U2NS1lMTE0LTQ3MzUtOTE0ZS03M2FlYTI5ZTA2MzciLCJleHAiOjE3Nzk4Mjk2MTd9.ruLt3Glvo4lMX-y0yT3cOxbEoGdnstLV_MvxKDW21Mw"   # <-- Replace with your real JWT

async def send_gps():
    try:
        uri = f"{TRACKING_URL}{TRIP_ID}?token={TOKEN}"
        async with websockets.connect(uri) as websocket:
            msg = {
                "latitude": 12.34,
                "longitude": 56.78,
                "timestamp": "2026-05-26T20:00:00Z"
            }
            await websocket.send(json.dumps(msg))
            ack = await websocket.recv()
            print("Server says:", ack)
    except Exception as e:
        print("Error:", e)

asyncio.run(send_gps())