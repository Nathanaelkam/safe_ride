from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import VerificationCode
from ..email_service import send_otp_email
import random
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-otp")
async def send_otp(email: str, db: AsyncSession = Depends(get_db)):
    # Generate 6‑digit code
    code = str(random.randint(100000, 999999))
    expires = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Store it
    db.add(VerificationCode(email=email, code=code, expires_at=expires))
    await db.commit()

    # Send the email (or log it)
    send_otp_email(email, code)

    return {"message": "Verification code sent to your email"}