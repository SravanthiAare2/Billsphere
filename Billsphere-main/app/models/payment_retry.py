from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database.database import Base

class PaymentRetry(Base):
    __tablename__ = "payment_retries"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False)
    attempt_number = Column(Integer, nullable=False)
    scheduled_for = Column(DateTime(timezone=True), nullable=False)
    outcome = Column(String, nullable=True)  # pending/succeeded/failed
    created_at = Column(DateTime(timezone=True), server_default=func.now())