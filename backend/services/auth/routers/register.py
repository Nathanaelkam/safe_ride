from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User
from ..schemas import UserRegister, UserOut
from ..auth_utils import hash_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check for duplicate phone number
    existing = await db.execute(select(User).where(User.phone_number == data.phone_number))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    user = User(
        phone_number=data.phone_number,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user