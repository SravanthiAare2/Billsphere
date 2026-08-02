from app.database.database import Base, engine
from app.models.customer import Customer
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.billing_cycle import BillingCycle
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.payment_retry import PaymentRetry
from app.models.audit_log import AuditLog
from app.models.user import User

Base.metadata.create_all(bind=engine)
print("All tables created successfully")