import asyncio
import json
import redis.asyncio as redis

async def main():
    r = redis.from_url("redis://localhost:6379/0", encoding="utf-8", decode_responses=True)
    pubsub = r.pubsub()
    await pubsub.subscribe("anomaly.detected")
    
    # 1. Publish fake GPS event
    payload = {
        "trip_id": "test-trip-123",
        "lat": 40.7130,   # Off-route coordinate
        "lng": -74.0040, 
        "timestamp": "2026-05-25T12:00:00Z"
    }
    
    print(f"Publishing GPS: {payload}")
    await r.publish("location_updates", json.dumps(payload))
    
    # 2. Wait for anomaly event
    while True:
        message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=2.0)
        if message:
            print(f"Received ANOMALY: {message['data']}")
            break
        await asyncio.sleep(0.1)
        
    await r.aclose()

if __name__ == "__main__":
    asyncio.run(main())
