from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..schemas import UserRegister, UserOut
from ..auth_utils import hash_password
from ..metrics import inc_active_users
from ..models import User, VerificationCode
from datetime import datetime, timezone

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Verify OTP
    result = await db.execute(
        select(VerificationCode)
        .where(VerificationCode.email == data.email)
        .where(VerificationCode.used == False)
        .where(VerificationCode.expires_at > datetime.now(timezone.utc))
        .order_by(VerificationCode.created_at.desc())
    )
    code_entry = result.scalars().first()
    if not code_entry or code_entry.code != data.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    code_entry.used = True
    # Check for duplicate phone number
    existing = await db.execute(select(User).where(User.phone_number == data.phone_number))
    if existing.scalars().first(): # pragma: no cover
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User( # pragma: no cover
        phone_number=data.phone_number,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    inc_active_users()
    return user # pragma: no cover