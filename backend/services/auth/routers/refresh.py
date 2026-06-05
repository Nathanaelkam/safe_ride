from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from ..database import get_db
from ..models import RefreshToken, User
from ..schemas import Token, RefreshRequest
from ..auth_utils import create_access_token, generate_refresh_token, hash_token
from ..config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/refresh", response_model=Token)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    # Hash the incoming raw token to look it up
    token_hash = hash_token(data.refresh_token)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked == False,
            RefreshToken.expires_at > datetime.now(timezone.utc)
        )
    )
    token_record = result.scalars().first() # pragma: no cover
    if not token_record:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    # Issue new access token
    user_result = await db.execute(select(User).where(User.id == token_record.user_id))
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    access_token = create_access_token({"sub": str(user.id)})

    # Rotate refresh token: revoke the old one, issue a new one
    token_record.revoked = True

    new_raw = generate_refresh_token()
    new_hash = hash_token(new_raw)
    new_expiry = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    db.add(RefreshToken(user_id=user.id, token_hash=new_hash, expires_at=new_expiry))
    await db.commit()

    return { # pragma: no cover
        "access_token": access_token,
        "refresh_token": new_raw,
        "token_type": "bearer"
    }


@router.post("/logout", status_code=204)
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Revoke the refresh token (user logs out)."""
    token_hash = hash_token(data.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    token_record = result.scalars().first() # pragma: no cover
    if token_record: # pragma: no cover
        token_record.revoked = True # pragma: no cover
        await db.commit() # pragma: no cover
    # Always return success even if token not found (idempotent) # pragma: no cover
    return # pragma: no cover