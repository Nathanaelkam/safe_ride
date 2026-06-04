# twilio_sender.py – placeholder for real SMS integration
# pragma: no cover
import asyncio, json
import redis.asyncio as aioredis
import httpx
from ..shared.redis_client import get_redis
from ..shared.event_channels import SOS_TRIGGERED_CHANNEL, ROUTE_DEVIATED_CHANNEL
import os
from ..notifications.twilio_sender import send_sms_twilio
from ..metrics import (
    NOTIFICATION_EVENTS_RECEIVED_TOTAL,
    CONTACT_FETCH_ATTEMPTS_TOTAL,
    CONTACT_FETCH_ERRORS_TOTAL,
    ALERTS_DISPATCHED_TOTAL,
    ALERTS_SKIPPED_NO_CONTACT_TOTAL,
)

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")

async def get_emergency_contacts(passenger_id: str) -> list:
    """Queries the Auth Service to retrieve emergency contacts — respects microservice boundaries."""
    CONTACT_FETCH_ATTEMPTS_TOTAL.inc()
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{AUTH_SERVICE_URL}/contacts/user/{passenger_id}", timeout=5.0)
            if res.status_code == 200:
                contacts = res.json()
                if "contacts" in contacts:
                    return contacts["contacts"]
                return contacts
        except Exception as e:
            CONTACT_FETCH_ERRORS_TOTAL.inc()
            print(f"[Notification] Error fetching contacts: {e}")
    return []

async def dispatch_alert(event: dict, alert_type: str):
    # Support mappings from both Emergency (user_id, latitude) and Route Analysis (passenger_id, lat)
    passenger_id = event.get("passenger_id") or event.get("user_id") or event.get("trip_id")
    lat = event.get("lat") or event.get("latitude") or 0
    lng = event.get("lng") or event.get("longitude") or 0
    maps_link = f"https://maps.google.com/?q={lat},{lng}"

    contacts = await get_emergency_contacts(passenger_id)
    if not contacts:
        ALERTS_SKIPPED_NO_CONTACT_TOTAL.inc()
        print(f"[Notification] No contacts found for {passenger_id}")
        return

    for contact in contacts:
        phone = contact.get("phone_number") or contact.get("contact_phone")
        if not phone:
            continue
            
        name = contact.get("name") or contact.get("contact_name", "Contact")

        if alert_type == "SOS":
            msg = f"🚨 SAFERIDE EMERGENCY: The passenger has triggered an SOS! Location: {maps_link}"
        else:
            conf = int(event.get("confidence", 0.8) * 100)
            msg = f"⚠️ SAFERIDE WARNING: Unusual route detected ({conf}% confidence). Location: {maps_link}"

        # For MVP: print. For production: use Twilio
        ALERTS_DISPATCHED_TOTAL.inc()
        print(f"[Notification] *** ALERT TO {phone}: {msg} ***")
        # await send_sms_twilio(phone, msg)

async def run_subscriber():
    redis_client = await get_redis()
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(SOS_TRIGGERED_CHANNEL, ROUTE_DEVIATED_CHANNEL)
    print(f"[Notification] Subscribed to: {SOS_TRIGGERED_CHANNEL}, {ROUTE_DEVIATED_CHANNEL}")

    try:
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            NOTIFICATION_EVENTS_RECEIVED_TOTAL.inc()
            channel = message["channel"]
            event = json.loads(message["data"])
            target_id = event.get("passenger_id") or event.get("user_id") or event.get("trip_id")
            print(f"[Notification] Received {channel} event for {target_id}")

            if channel == SOS_TRIGGERED_CHANNEL:
                await dispatch_alert(event, "SOS")
            elif channel == ROUTE_DEVIATED_CHANNEL:
                await dispatch_alert(event, "ANOMALY")
    except asyncio.CancelledError:
        print("[Notification] Subscriber task cancelled.")
    finally:
        await pubsub.unsubscribe(SOS_TRIGGERED_CHANNEL, ROUTE_DEVIATED_CHANNEL)
        await redis_client.aclose()
