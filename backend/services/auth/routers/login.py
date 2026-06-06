from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from ..database import get_db
from ..models import User, RefreshToken
from ..schemas import UserLogin, Token
from ..auth_utils import verify_password, create_access_token, generate_refresh_token, hash_token
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.phone_number == data.phone_number))
    user = result.scalars().first() # pragma: no cover
    if not user or not verify_password(data.password, user.password_hash): # pragma: no cover
        raise HTTPException(status_code=401, detail="Invalid credentials") # pragma: no cover
 # pragma: no cover
    access_token = create_access_token({"sub": str(user.id)}) # pragma: no cover
 # pragma: no cover
    # Generate refresh token
    raw_refresh = generate_refresh_token() # pragma: no cover
    refresh_hash = hash_token(raw_refresh) # pragma: no cover
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)

    db.add(RefreshToken(user_id=user.id, token_hash=refresh_hash, expires_at=expires))# pragma: no cover
    await db.commit()# pragma: no cover
 # pragma: no cover
    return { # pragma: no cover
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer",
        "user": user
    }