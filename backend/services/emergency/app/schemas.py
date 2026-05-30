"""
Pydantic schemas for the Emergency Trigger Service.

Defines all request bodies and response models used by the emergency endpoints.
FastAPI uses these to auto-generate the OpenAPI/Swagger documentation.
"""

from typing import Optional
from pydantic import BaseModel, Field


class PanicRequest(BaseModel):
    """Payload sent by the mobile app when the user presses the panic button."""

    user_id: str = Field(..., description="UUID of the authenticated user")
    trip_id: Optional[str] = Field(None, description="UUID of the active trip, if any")
    latitude: Optional[float] = Field(None, description="Current latitude")
    longitude: Optional[float] = Field(None, description="Current longitude")


class VoiceSOSRequest(BaseModel):
    """Payload sent by the mobile app after speech-to-text transcription."""

    user_id: str = Field(..., description="UUID of the authenticated user")
    trip_id: Optional[str] = Field(None, description="UUID of the active trip, if any")
    transcript: str = Field(
        ..., description="Raw speech-to-text transcript from the mobile device"
    )
    latitude: Optional[float] = Field(None, description="Current latitude")
    longitude: Optional[float] = Field(None, description="Current longitude")


class SOSAcknowledgement(BaseModel):
    """Standard response returned for every SOS request regardless of outcome."""

    status: str
    message: str
    event: str = "SOS_TRIGGERED"
