"""
BillSphere End-to-End Integration Test

Covers the full billing flow across modules:

subscription engine -> billing cycle -> invoice generator
-> payment webhooks -> retry/dunning engine

Uses direct service calls against the test database so the
full chain can be exercised without depending on Celery/Redis
being available in CI.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.payment import Payment
from app.models.plan import Plan
from app.models.subscription import Subscription
from app.models.user import User
from app.services.payment_service import (
    mark_payment_failed,
    mark_payment_success,
)
from app.services.subscription_service import (
    activate_subscription,
)
from app.workers.tasks import process_payment_retries


def _seed_billing_chain(db_session):
    """
    Create a minimal, connected chain of records:
    user -> customer -> plan -> subscription -> invoice -> payment
    """

    user = User(
        first_name="Test",
        last_name="Admin",
        email="integration_test@example.com",
        password_hash="not_a_real_hash",
        role="admin",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    customer = Customer(
        owner_id=user.id,
        company_name="Integration Test Co",
        contact_name="Test Contact",
        email="customer_integration@example.com",
        country="IN",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    plan = Plan(
        name="Integration Test Plan",
        price=999.0,
        currency="INR",
        billing_cycle="monthly",
        trial_days=0,
    )
    db_session.add(plan)
    db_session.commit()
    db_session.refresh(plan)

    subscription = Subscription(
        customer_id=customer.id,
        plan_id=plan.id,
        start_date=datetime.now(timezone.utc),
        status="trial",
        billing_cycle="monthly",
    )
    db_session.add(subscription)
    db_session.commit()
    db_session.refresh(subscription)

    invoice = Invoice(
        invoice_number="INV-TEST-000001",
        customer_id=customer.id,
        subscription_id=subscription.id,
        amount=Decimal("999.00"),
        tax_amount=Decimal("179.82"),
        total_amount=Decimal("1178.82"),
        status="pending",
    )
    db_session.add(invoice)
    db_session.commit()
    db_session.refresh(invoice)

    payment = Payment(
        invoice_id=invoice.id,
        amount=Decimal("1178.82"),
        payment_method="card",
        status="pending",
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    return subscription, invoice, payment


# ==========================================================
# Full Success Path
# ==========================================================

def test_full_billing_flow_success_path(db_session):
    """
    trial -> active -> invoice paid -> subscription stays active
    """

    subscription, invoice, payment = _seed_billing_chain(db_session)

    activate_subscription(db_session, subscription.id, created_by=None)
    db_session.refresh(subscription)
    assert subscription.status == "active"

    mark_payment_success(db_session, payment.id, "txn_integration_success")
    db_session.refresh(payment)
    db_session.refresh(invoice)

    assert payment.status == "completed"
    assert invoice.status == "paid"


# ==========================================================
# Full Failure -> Dunning -> Cancellation Path
# ==========================================================

def test_full_billing_flow_dunning_to_cancellation(db_session):
    """
    trial -> active -> payment fails -> past_due -> retries
    exhausted -> cancelled
    """

    subscription, invoice, payment = _seed_billing_chain(db_session)

    activate_subscription(db_session, subscription.id, created_by=None)
    db_session.refresh(subscription)

    mark_payment_failed(db_session, payment.id)
    db_session.refresh(subscription)
    db_session.refresh(payment)

    assert payment.status == "failed"
    assert subscription.status == "past_due"

    # First retry job run: schedules the first retry attempt.
    process_payment_retries()

    # Manually push the scheduled retry into the past so the
    # next run treats it as exhausted-eligible, simulating time
    # passing across the Day 1 / 3 / 7 schedule without waiting.
    from app.models.payment_retry import PaymentRetry

    retries = (
        db_session.query(PaymentRetry)
        .filter(PaymentRetry.payment_id == payment.id)
        .all()
    )

    for retry in retries:
        retry.retry_count = 3
        retry.retry_date = datetime.now(timezone.utc) - timedelta(days=1)

    db_session.commit()

    process_payment_retries()

    db_session.refresh(subscription)

    assert subscription.status == "cancelled"