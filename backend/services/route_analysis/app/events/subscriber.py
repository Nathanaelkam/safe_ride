import asyncio
import json
import logging
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import AsyncSessionLocal
from ..metrics import (
    GPS_CHECKS_TOTAL,
    ANOMALY_DETECTIONS_TOTAL,
    MALFORMED_GPS_EVENTS_TOTAL,
    ANOMALY_PUBLISHED_TOTAL,
)
from ..route_analyzer import analyze_gps
from .models import Anomaly

logger = logging.getLogger("route_analysis.subscriber")

async def consume_gps_updates():
    """Background task to consume GPS updates and run AI detection."""
    client = redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
    pubsub = client.pubsub()
    
    try:
        await pubsub.subscribe(settings.gps_updates_channel)
        logger.info(f"Subscribed to Redis channel: {settings.gps_updates_channel}")

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    GPS_CHECKS_TOTAL.inc()
                    payload = json.loads(message["data"])
                    trip_id = payload["trip_id"]
                    lat = float(payload["lat"])
                    lng = float(payload["lng"])
                    timestamp = payload.get("timestamp")
                    
                    logger.info(f"Received GPS: trip={trip_id}, lat={lat}, lng={lng}")

                    is_anomaly, anomaly_type, confidence = analyze_gps(lat, lng)

                    if is_anomaly:
                        ANOMALY_DETECTIONS_TOTAL.inc()
                        logger.warning(f"Anomaly detected! trip={trip_id}, type={anomaly_type}")
                        
                        # Persist to DB
                        async with AsyncSessionLocal() as session:
                            new_anomaly = Anomaly(
                                trip_id=trip_id,
                                type=anomaly_type,
                                confidence=confidence,
                                lat=lat,
                                lng=lng
                            )
                            session.add(new_anomaly)
                            await session.commit()
                            
                        # Publish ANOMALY_DETECTED
                        anomaly_event = {
                            "trip_id": trip_id,
                            "type": anomaly_type,
                            "confidence": confidence,
                            "lat": lat,
                            "lng": lng,
                            "detected_at": new_anomaly.detected_at.isoformat() if new_anomaly.detected_at else None
                        }
                        await client.publish(settings.anomaly_detected_channel, json.dumps(anomaly_event))
                        ANOMALY_PUBLISHED_TOTAL.inc()
                        logger.info(f"Published to {settings.anomaly_detected_channel}")

                except (KeyError, ValueError, json.JSONDecodeError) as e:
                    MALFORMED_GPS_EVENTS_TOTAL.inc()
                    logger.error(f"Malformed GPS message: {message['data']}, error: {e}")
                except Exception as e:
                    logger.error(f"Error processing GPS event: {e}")
                    
    except asyncio.CancelledError:
        logger.info("Subscriber task cancelled")
    finally:
        await pubsub.unsubscribe(settings.gps_updates_channel)
        await client.aclose()
