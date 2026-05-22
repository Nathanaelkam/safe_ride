import uuid
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship
import enum


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    phone_number = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    contacts = relationship(
        "UserContact", back_populates="owner", foreign_keys="[UserContact.user_id]"
    )


class HandshakeStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class UserContact(Base):
    __tablename__ = "user_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    contact_phone = Column(String(20), nullable=False)
    contact_name = Column(String(100), nullable=False)
    status = Column(SQLEnum(HandshakeStatus), default=HandshakeStatus.PENDING)

    # Relationship
    owner = relationship("User", back_populates="contacts", foreign_keys=[user_id])