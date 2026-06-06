from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User, RegistrationSession, RefreshToken
from ..schemas import (
    RegistrationInitRequest,
    RegistrationInitResponse,
    RegistrationVerifyRequest,
    UserOut,
    Token,
)
from ..auth_utils import hash_password, create_access_token, generate_refresh_token, hash_token
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


@router.post("/register/verify", response_model=Token, status_code=201)
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

    # Generate tokens
    access_token = create_access_token({"sub": str(user.id)})
    
    # Generate refresh token
    raw_refresh = generate_refresh_token()
    refresh_hash = hash_token(raw_refresh)
    from ..config import settings
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    
    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires))
    await db.commit()

    inc_active_users()
    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": user
    }