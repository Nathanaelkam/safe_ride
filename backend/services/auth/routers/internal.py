from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from ..database import get_db
from ..models import UserContact, HandshakeStatus
from ..schemas import ContactResponse

router = APIRouter(prefix="/internal", tags=["internal"])


@router.get("/contacts/{user_id}", response_model=List[ContactResponse])
async def get_user_contacts(user_id: str, db: AsyncSession = Depends(get_db)):
    """Internal endpoint for Notification Service to fetch accepted contacts."""
    result = await db.execute(
        select(UserContact).where(
            UserContact.user_id == user_id,
            UserContact.status == HandshakeStatus.ACCEPTED
        )
    )
    contacts = result.scalars().all()
    return contacts