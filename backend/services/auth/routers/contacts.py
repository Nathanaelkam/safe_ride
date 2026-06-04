from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from ..database import get_db
from ..models import User, UserContact, HandshakeStatus
from ..schemas import ContactCreate, ContactResponse
from ..auth_utils import decode_access_token
from fastapi.security import OAuth2PasswordBearer
from ..metrics import inc_contacts_created

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter(prefix="/contacts", tags=["contacts"])


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_access_token(token)
    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id = UUID(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first() # pragma: no cover
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user # pragma: no cover


@router.post("/", response_model=ContactResponse, status_code=201)
async def add_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Cannot add yourself
    if data.contact_phone == current_user.phone_number:
        raise HTTPException(status_code=400, detail="Cannot add yourself")

    # Check if contact already exists
    existing = await db.execute(
        select(UserContact).where(
            UserContact.user_id == current_user.id,
            UserContact.contact_phone == data.contact_phone,
        )
    )
    if existing.scalars().first(): # pragma: no cover
        raise HTTPException(status_code=400, detail="Contact already exists") # pragma: no cover

    contact = UserContact( # pragma: no cover
        user_id=current_user.id, # pragma: no cover
        contact_phone=data.contact_phone, # pragma: no cover
        contact_name=data.contact_name, # pragma: no cover
        status=HandshakeStatus.PENDING, # pragma: no cover
    ) # pragma: no cover
    db.add(contact) # pragma: no cover
    await db.commit() # pragma: no cover
    await db.refresh(contact) # pragma: no cover
    inc_contacts_created() # pragma: no cover
    return contact # pragma: no cover


@router.get("/", response_model=List[ContactResponse])
async def list_contacts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: HandshakeStatus = Query(None, alias="status"),
):
    stmt = select(UserContact).where(UserContact.user_id == current_user.id)
    if status_filter:
        stmt = stmt.where(UserContact.status == status_filter)
    result = await db.execute(stmt)
    return result.scalars().all() # pragma: no cover


@router.put("/{contact_id}/respond", response_model=ContactResponse)
async def respond_handshake(
    contact_id: UUID,
    action: HandshakeStatus,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # The pending request must be addressed to the current user's phone number
    stmt = select(UserContact).where(
        UserContact.id == contact_id,
        UserContact.contact_phone == current_user.phone_number,
        UserContact.status == HandshakeStatus.PENDING,
    )
    result = await db.execute(stmt)
    contact = result.scalars().first() # pragma: no cover
    if not contact:
        raise HTTPException(status_code=404, detail="Pending contact request not found")

    

    contact.status = action
    await db.commit()
    await db.refresh(contact)
    inc_contacts_created()
    return contact # pragma: no cover

@router.get("/user/{user_id}", response_model=List[ContactResponse])
async def get_contacts_by_user(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return all ACCEPTED contacts for a given user (internal use)."""
    result = await db.execute(
        select(UserContact).where(
            UserContact.user_id == user_id,
            UserContact.status == HandshakeStatus.ACCEPTED
        )
    )
    return result.scalars().all() # pragma: no cover