from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import Trip, TripStatus
from ..auth_utils import decode_access_token, create_access_token
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/trips", tags=["trips"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload["sub"]


@router.post("/{trip_id}/share")
async def create_share_link(
    trip_id: str,
    passenger_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a short-lived share token that allows anyone with the link
    to view the trip's real-time GPS stream. Only the trip owner can call this.
    """
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalars().first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.passenger_id != passenger_id:
        raise HTTPException(status_code=403, detail="Not your trip")
    if trip.status != TripStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Trip not active")

    # Create a share token with limited claims (trip_id, scope: view)
    share_token = create_access_token(
        data={
            "sub": passenger_id,
            "trip_id": trip_id,
            "scope": "view",
        },
        expires_in=3600,  # 1 hour
    )
    return {"share_token": share_token, "expires_in": 3600}