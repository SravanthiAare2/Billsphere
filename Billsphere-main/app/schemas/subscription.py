from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SubscriptionCreate(BaseModel):
    plan_id: int

class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    cancel_at_period_end: Optional[bool] = None

class SubscriptionCancelRequest(BaseModel):
    immediate: bool = False  # False = cancel at end of current period, True = cancel now

class SubscriptionResponse(BaseModel):
    id: int
    customer_id: int
    plan_id: int
    status: str
    trial_ends_at: Optional[datetime]
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    created_at: datetime

    class Config:
        from_attributes = True