"""
Emergency trigger router for the Emergency Trigger Service.

Endpoints:
  POST /emergency/panic  — manual panic button press
  POST /emergency/voice  — voice SOS transcript analysis

Both endpoints publish an SOS_TRIGGERED event to the Redis event bus
and always return HTTP 200 so the mobile app is never blocked.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, status

from ..schemas import PanicRequest, VoiceSOSRequest, SOSAcknowledgement
from ..redis_client import publish_sos_event
from ..metrics import PANIC_COUNTER, VOICE_COUNTER
from ..config import settings

logger = logging.getLogger("emergency_service.routers.emergency")

router = APIRouter(prefix="/emergency", tags=["emergency"])


@router.post(
    "/panic",
    response_model=SOSAcknowledgement,
    status_code=status.HTTP_200_OK,
    summary="Trigger a manual panic / SOS alert",
)
async def panic(data: PanicRequest):
    """
    Called by the mobile app when the user presses the **panic button**.

    Immediately publishes an ``SOS_TRIGGERED`` event to the Redis event bus.
    The Notification Service is responsible for reading the event and
    alerting the user's emergency contacts.
    """
    PANIC_COUNTER.inc()

    event_payload = {
        "source": "PANIC_BUTTON",
        "user_id": data.user_id,
        "trip_id": data.trip_id or "",
        "latitude": str(data.latitude) if data.latitude is not None else "",
        "longitude": str(data.longitude) if data.longitude is not None else "",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await publish_sos_event(event_payload)

    return SOSAcknowledgement(
        status="accepted",
        message="SOS_TRIGGERED event published. Emergency contacts will be notified.",
    )


@router.post(
    "/voice",
    response_model=SOSAcknowledgement,
    status_code=status.HTTP_200_OK,
    summary="Submit a voice SOS transcript for analysis",
)
async def voice_sos(data: VoiceSOSRequest):
    """
    Receives a **speech-to-text transcript** from the mobile device.

    The service checks whether the transcript contains any configured
    trigger phrases (e.g. "help", "SOS", "danger"). If a match is found,
    it publishes an ``SOS_TRIGGERED`` event identical to a panic-button press.

    Returns ``200`` in all cases so the mobile client is never blocked.
    If no trigger phrase is detected, the response status will be ``"ignored"``.
    """
    VOICE_COUNTER.inc()

    transcript_lower = data.transcript.lower()
    triggered = any(
        phrase in transcript_lower for phrase in settings.trigger_phrases
    )

    if not triggered:
        logger.info(
            "Voice transcript from user %s did not match any trigger phrase: '%s'",
            data.user_id,
            data.transcript,
        )
        return SOSAcknowledgement(
            status="ignored",
            message="No SOS trigger phrase detected in transcript.",
        )

    event_payload = {
        "source": "VOICE_SOS",
        "user_id": data.user_id,
        "trip_id": data.trip_id or "",
        "latitude": str(data.latitude) if data.latitude is not None else "",
        "longitude": str(data.longitude) if data.longitude is not None else "",
        "transcript": data.transcript,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await publish_sos_event(event_payload)

    return SOSAcknowledgement(
        status="accepted",
        message="SOS_TRIGGERED event published. Emergency contacts will be notified.",
    )
