from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from app.database.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String, nullable=False)  # subscription/invoice/payment
    entity_id = Column(Integer, nullable=False)
    event = Column(String, nullable=False)  # e.g. "subscription.plan_changed"
    actor = Column(String, nullable=True)
    metadata_info = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())