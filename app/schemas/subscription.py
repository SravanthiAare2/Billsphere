from pydantic import BaseModel, Field


class SubscriptionItem(BaseModel):
    name: str = Field(..., description="Service name")
    plan: str = Field(..., description="Plan title")
    price: float = Field(..., description="Price in ₹")
    billing: str = Field(..., description="Billing cycle, e.g., Monthly or Yearly")
    status: str = Field(..., description="Subscription status, e.g., Active or Paused")
    logo: str | None = Field(None, description="URL of the service logo")


class SubscriptionsUpdatePayload(BaseModel):
    subscriptions: str = Field(..., description="JSON-serialized list of SubscriptionItem objects")
