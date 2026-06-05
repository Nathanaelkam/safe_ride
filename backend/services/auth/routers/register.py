from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User, RegistrationSession
from ..schemas import (
    RegistrationInitRequest,
    RegistrationInitResponse,
    RegistrationVerifyRequest,
    UserOut,
)
from ..auth_utils import hash_password
from ..metrics import inc_active_users
from ..email_service import send_otp_email
import random
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/init", response_model=RegistrationInitResponse, status_code=201)
async def register_init(data: RegistrationInitRequest, db: AsyncSession = Depends(get_db)):
    # Check if phone or email already registered
    existing = await db.execute(
        select(User).where(
            (User.phone_number == data.phone_number) | (User.email == data.email)
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Phone or email already registered")

    # Check if an unexpired session already exists for this email
    existing_session = await db.execute(
        select(RegistrationSession)
        .where(RegistrationSession.email == data.email)
        .where(RegistrationSession.verified == False)
        .where(RegistrationSession.expires_at > datetime.now(timezone.utc))
    )
    if existing_session.scalars().first():
        raise HTTPException(status_code=400, detail="A verification code was already sent. Please check your email.")

    # Generate OTP and store the session
    otp = str(random.randint(100000, 999999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)

    session = RegistrationSession(
        email=data.email,
        phone_number=data.phone_number,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        otp=otp,
        expires_at=expires,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    send_otp_email(data.email, otp)

    return RegistrationInitResponse(
        session_token=str(session.id),
        message="Verification code sent to your email",
    )


@router.post("/register/verify", response_model=UserOut, status_code=201)
async def register_verify(data: RegistrationVerifyRequest, db: AsyncSession = Depends(get_db)):
    # Find the session
    result = await db.execute(
        select(RegistrationSession)
        .where(RegistrationSession.id == data.session_token)
        .where(RegistrationSession.verified == False)
        .where(RegistrationSession.expires_at > datetime.now(timezone.utc))
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=400, detail="Invalid or expired session")
    if session.otp != data.otp:
        raise HTTPException(status_code=400, detail="Invalid verification code")

    session.verified = True

    # Create the user
    user = User(
        phone_number=session.phone_number,
        email=session.email,
        password_hash=session.password_hash,
        full_name=session.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    inc_active_users()
    return user