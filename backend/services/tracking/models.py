import uuid
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase
import enum


class Base(DeclarativeBase):
    pass


class TripStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SOS_TRACKED = "SOS_TRACKED"


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    passenger_id = Column(String(36), nullable=False, index=True)   # UUID string from Auth Service
    status = Column(SQLEnum(TripStatus), default=TripStatus.ACTIVE)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)