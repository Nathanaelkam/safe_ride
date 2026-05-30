from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class TripStartRequest(BaseModel):
    # empty body – just a marker that we want to start a trip
    pass


class TripResponse(BaseModel):
    id: UUID
    passenger_id: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LocationMessage(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    timestamp: datetime