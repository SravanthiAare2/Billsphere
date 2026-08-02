from pydantic import BaseModel
from datetime import datetime

class PlanCreate(BaseModel):
    name: str
    price: float
    billing_interval: str
    trial_period_days: int = 0

class PlanResponse(BaseModel):
    id: int
    name: str
    price: float
    billing_interval: str
    trial_period_days: int
    created_at: datetime

    class Config:
        from_attributes = True