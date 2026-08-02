from pydantic import BaseModel, EmailStr
from datetime import datetime

class CustomerCreate(BaseModel):
    name: str
    email: EmailStr
    billing_country: str

class CustomerResponse(BaseModel):
    id: int
    name: str
    email: str
    billing_country: str
    created_at: datetime

    class Config:
        from_attributes = True