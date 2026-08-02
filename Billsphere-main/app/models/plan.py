from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.sql import func
from app.database.database import Base

class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    billing_interval = Column(String, nullable=False)  # "monthly" or "yearly"
    trial_period_days = Column(Integer, nullable=False, default=0)  # 0 = no trial
    created_at = Column(DateTime(timezone=True), server_default=func.now())