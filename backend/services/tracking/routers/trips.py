from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import uuid4
from ..database import get_db
from ..models import Trip
from ..schemas import TripStartRequest, TripResponse
from ..auth_utils import decode_access_token
from ..metrics import inc_active_trips
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/trips", tags=["trips"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]


@router.post("/start", response_model=TripResponse, status_code=201)
async def start_trip(
    passenger_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    trip = Trip(
        id=uuid4(),
        passenger_id=passenger_id,
        status="ACTIVE",
    )
    db.add(trip)
    await db.commit()
    await db.refresh(trip)
    return trip


@router.post("/{trip_id}/complete", response_model=TripResponse)
async def complete_trip(
    trip_id: str,
    passenger_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select as _select
    result = await db.execute(_select(Trip).where(Trip.id == trip_id))
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.passenger_id != passenger_id:
        raise HTTPException(status_code=403, detail="Not your trip")
    if trip.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Trip not active")

    trip.status = "COMPLETED"
    import datetime
    trip.completed_at = datetime.datetime.now(datetime.UTC)
    await db.commit()
    inc_active_trips()
    await db.refresh(trip)
    return trip