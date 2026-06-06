from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# ---- User ----
class UserRegister(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=20, example="+1234567890")
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, example="SecureP@ss1")
    full_name: Optional[str] = None
    otp: str


class UserLogin(BaseModel):
    phone_number: str
    password: str


class UserOut(BaseModel):
    id: UUID
    phone_number: str
    full_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: Optional[UserOut] = None


# ---- Contacts ----
class ContactCreate(BaseModel):
    contact_phone: str = Field(..., min_length=10, max_length=20)
    contact_name: str = Field(..., min_length=1, max_length=100)


class ContactResponse(BaseModel):
    id: UUID
    contact_phone: str
    contact_name: str
    status: str

    model_config = {"from_attributes": True}

class RefreshRequest(BaseModel):
    refresh_token: str

class RegistrationInitRequest(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=20)
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class RegistrationInitResponse(BaseModel):
    session_token: str
    message: str


class RegistrationVerifyRequest(BaseModel):
    session_token: str
    otp: str