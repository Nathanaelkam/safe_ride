from sqlalchemy import Column, String, Float, DateTime, Integer
from datetime import datetime, timezone
import uuid
from ..database import Base

class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    trip_id = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False) # e.g., "ROUTE_DEVIATION"
    confidence = Column(Float, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
