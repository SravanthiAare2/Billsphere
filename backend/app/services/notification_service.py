
"""
BillSphere Notification Service

Handles:

- Creating notification records
- Invoice notifications (+ email)
- Payment notifications (+ email)
- Payment failure notifications (+ email)
- Invoice overdue notifications (+ email)
- Subscription expiry notifications (+ email)
- Listing user notifications
- Unread notification count
- Marking notifications as read
- Marking all notifications as read
- Deleting notifications

Every send_* function below creates a PostgreSQL notification
record AND attempts email delivery. If email delivery fails,
the notification record still remains (is_sent stays False) --
the business operation that triggered it must never fail because
of an SMTP problem.
"""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.notification import Notification
from app.models.user import User
from app.services import email_templates
from app.services.email_service import send_email


# ==========================================================
# Create Notification
# ==========================================================

def create_notification(
    db: Session,
    user_id: int | None,
    title: str,
    message: str,
    notification_type: str = "system",
    customer_id: int | None = None,
) -> Notification:
    """
    Create and persist a notification record.

    New notifications are unread and unsent by default.
    """

    notification = Notification(
        user_id=user_id,
        customer_id=customer_id,
        title=title,
        message=message,
        notification_type=notification_type,
        is_sent=False,
        sent_at=None,
        is_read=False,
        read_at=None,
        created_at=datetime.now(timezone.utc),
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return notification


# ==========================================================
# Mark Notification As Sent / Failed
# ==========================================================

def mark_notification_as_sent(
    db: Session,
    notification: Notification,
) -> Notification:
    """
    Mark a notification as successfully delivered.
    """

    notification.is_sent = True
    notification.sent_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(notification)

    return notification


def _mark_notification_send_result(
    db: Session,
    notification: Notification,
    delivered: bool,
) -> Notification:
    """
    Apply the is_sent/sent_at outcome of an email delivery attempt.
    """

    if delivered:
        return mark_notification_as_sent(db, notification)

    notification.is_sent = False
    notification.sent_at = None
    db.commit()
    db.refresh(notification)

    return notification


# ==========================================================
# Recipient Resolution
# ==========================================================

def _resolve_recipient_email(
    db: Session,
    user_id: int | None,
    customer_id: int | None,
) -> tuple[str | None, str]:
    """
    Resolve an email address + display first-name for a
    notification, preferring the customer record (billing
    contact) and falling back to the platform user account.
    """

    if customer_id is not None:
        customer = (
            db.query(Customer).filter(Customer.id == customer_id).first()
        )
        if customer and customer.email:
            first_name = (customer.contact_name or "there").split(" ")[0]
            return customer.email, first_name

    if user_id is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email:
            return user.email, user.first_name or "there"

    return None, "there"


def get_active_admin_users(db: Session) -> list[User]:
    """
    Return all active admin users, for admin-facing notifications.
    """

    return (
        db.query(User)
        .filter(User.role == "admin", User.is_active.is_(True))
        .all()
    )


def notify_admins(
    db: Session,
    title: str,
    message: str,
    notification_type: str,
) -> None:
    """
    Create a DB notification + send an email to every active
    admin user. Used for admin-facing events (new customer,
    payment received, payment failure, etc).
    """

    admins = get_active_admin_users(db)

    for admin in admins:
        notification = create_notification(
            db=db,
            user_id=admin.id,
            title=title,
            message=message,
            notification_type=notification_type,
        )

        try:
            subject, html = email_templates.admin_generic_event_email(
                title=title, message=message
            )
            delivered = send_email(admin.email, subject, html)
        except Exception:
            delivered = False

        _mark_notification_send_result(db, notification, delivered)


# ==========================================================
# Get User Notifications
# ==========================================================

def get_user_notifications(
    db: Session,
    user_id: int,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Notification], int, int]:
    """
    Get notifications belonging to a specific user.

    Returns:

    - notification items
    - total notification count
    - unread notification count
    """

    if page < 1:
        page = 1

    if page_size < 1:
        page_size = 20

    if page_size > 100:
        page_size = 100

    offset = (page - 1) * page_size

    base_query = db.query(Notification).filter(
        Notification.user_id == user_id
    )

    total = base_query.count()

    unread_count = base_query.filter(
        Notification.is_read.is_(False)
    ).count()

    notifications = (
        base_query
        .order_by(Notification.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    return notifications, total, unread_count


# ==========================================================
# Get Unread Notification Count
# ==========================================================

def get_unread_notification_count(
    db: Session,
    user_id: int,
) -> int:
    """
    Return the number of unread notifications
    belonging to the specified user.
    """

    return (
        db.query(func.count(Notification.id))
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .scalar()
        or 0
    )


# ==========================================================
# Get Single User Notification
# ==========================================================

def get_user_notification(
    db: Session,
    user_id: int,
    notification_id: int,
) -> Notification | None:
    """
    Get a single notification belonging to the user.
    """

    return (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
        .first()
    )


# ==========================================================
# Mark Notification As Read
# ==========================================================

def mark_notification_as_read(
    db: Session,
    user_id: int,
    notification_id: int,
) -> Notification | None:
    """
    Mark one user's notification as read.

    Returns None if the notification does not
    belong to the specified user.
    """

    notification = get_user_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        return None

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(notification)

    return notification


# ==========================================================
# Mark All Notifications As Read
# ==========================================================

def mark_all_notifications_as_read(
    db: Session,
    user_id: int,
) -> int:
    """
    Mark all unread notifications belonging
    to the specified user as read.

    Returns the number of notifications updated.
    """

    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .all()
    )

    if not notifications:
        return 0

    read_time = datetime.now(timezone.utc)

    for notification in notifications:
        notification.is_read = True
        notification.read_at = read_time

    db.commit()

    return len(notifications)


# ==========================================================
# Delete Notification
# ==========================================================

def delete_notification(
    db: Session,
    user_id: int,
    notification_id: int,
) -> bool:
    """
    Delete a notification belonging to the specified user.

    Returns:

    True  -> notification deleted
    False -> notification not found
    """

    notification = get_user_notification(
        db=db,
        user_id=user_id,
        notification_id=notification_id,
    )

    if notification is None:
        return False

    db.delete(notification)
    db.commit()

    return True


# ==========================================================
# Invoice Notification (+ email)
# ==========================================================

def send_invoice_notification(
    db: Session,
    customer_email: str,
    invoice_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
    amount: str | None = None,
) -> Notification:
    """
    Create an invoice-generated notification and email it to
    the customer.
    """

    notification = create_notification(
        db=db,
        user_id=user_id,
        customer_id=customer_id,
        title="Invoice Generated",
        message=(
            f"Invoice #{invoice_id} has been generated "
            f"for {customer_email}."
        ),
        notification_type="invoice",
    )

    recipient_email, first_name = _resolve_recipient_email(
        db, user_id, customer_id
    )
    recipient_email = recipient_email or customer_email

    try:
        subject, html = email_templates.invoice_generated_email(
            customer_name=first_name,
            invoice_number=str(invoice_id),
            amount=amount,
        )
        delivered = send_email(recipient_email, subject, html)
    except Exception:
        delivered = False

    return _mark_notification_send_result(db, notification, delivered)


# ==========================================================
# Payment Success Notification (+ email)
# ==========================================================

def send_payment_success_notification(
    db: Session,
    payment_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
    amount: str | None = None,
) -> Notification:
    """
    Create a successful payment notification and email it.
    """

    notification = create_notification(
        db=db,
        user_id=user_id,
        customer_id=customer_id,
        title="Payment Successful",
        message=(
            f"Payment #{payment_id} was completed successfully."
        ),
        notification_type="payment_success",
    )

    recipient_email, first_name = _resolve_recipient_email(
        db, user_id, customer_id
    )

    delivered = False
    if recipient_email:
        try:
            subject, html = email_templates.payment_success_email(
                customer_name=first_name,
                payment_id=payment_id,
                amount=amount,
            )
            delivered = send_email(recipient_email, subject, html)
        except Exception:
            delivered = False

    return _mark_notification_send_result(db, notification, delivered)


def send_payment_confirmation_notification(
    db: Session,
    payment_id: int,
    user_id: int,
    customer_id: int,
    customer_name: str,
    plan_name: str,
    billing_cycle: str,
    amount: str,
    currency: str,
    invoice_number: str,
    confirm_url: str,
    reject_url: str,
) -> Notification:
    """Create the pending-payment notification and send its email."""

    notification = create_notification(
        db=db,
        user_id=user_id,
        customer_id=customer_id,
        title="Payment confirmation required",
        message=(
            f"Your {currency} {amount} payment for {plan_name} "
            "is awaiting confirmation."
        ),
        notification_type="payment_confirmation_required",
    )

    delivered = False
    try:
        subject, html = email_templates.payment_confirmation_email(
            customer_name=customer_name,
            plan_name=plan_name,
            billing_cycle=billing_cycle,
            amount=amount,
            currency=currency,
            payment_id=payment_id,
            invoice_number=invoice_number,
            confirm_url=confirm_url,
            reject_url=reject_url,
        )
        recipient = db.query(User).filter(User.id == user_id).first()
        delivered = bool(recipient and send_email(recipient.email, subject, html))
    except Exception:
        delivered = False

    return _mark_notification_send_result(db, notification, delivered)


# ==========================================================
# Payment Failed Notification (+ email)
# ==========================================================

def send_payment_failed_notification(
    db: Session,
    payment_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
    reason: str | None = None,
) -> Notification:
    """
    Create a failed payment notification and email it.
    """

    notification = create_notification(
        db=db,
        user_id=user_id,
        customer_id=customer_id,
        title="Payment Failed",
        message=(
            f"Payment #{payment_id} failed. "
            "Please retry the payment."
        ),
        notification_type="payment_failed",
    )

    recipient_email, first_name = _resolve_recipient_email(
        db, user_id, customer_id
    )

    delivered = False
    if recipient_email:
        try:
            subject, html = email_templates.payment_failed_email(
                customer_name=first_name,
                payment_id=payment_id,
                reason=reason,
            )
            delivered = send_email(recipient_email, subject, html)
        except Exception:
            delivered = False

    return _mark_notification_send_result(db, notification, delivered)


# ==========================================================
# Invoice Overdue Notification (+ email)
# ==========================================================

def send_invoice_overdue_notification(
    db: Session,
    customer_email: str,
    invoice_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
    amount: str | None = None,
    due_date: str | None = None,
) -> Notification:
    """
    Create an overdue invoice notification and email it.
    """

    notification = create_notification(
        db=db,
        user_id=user_id,
        customer_id=customer_id,
        title="Invoice Overdue",
        message=(
            f"Invoice #{invoice_id} for {customer_email} "
            "is overdue."
        ),
        notification_type="invoice_overdue",
    )

    recipient_email, _ = _resolve_recipient_email(db, user_id, customer_id)
    recipient_email = recipient_email or customer_email

    try:
        subject, html = email_templates.invoice_overdue_email(
            invoice_id=invoice_id, amount=amount, due_date=due_date
        )
        delivered = send_email(recipient_email, subject, html)
    except Exception:
        delivered = False

    return _mark_notification_send_result(db, notification, delivered)


# ==========================================================
# Subscription Expiry Notification (+ email)
# ==========================================================

def send_subscription_expiry_notification(
    db: Session,
    subscription_name: str,
    expiry_date: str,
    user_id: int | None = None,
    customer_id: int | None = None,
) -> Notification:
    """
    Create a subscription-expiry notification and email it.
    """

    notification = create_notification(
        db=db,
        user_id=user_id,
        customer_id=customer_id,
        title="Subscription Expiring",
        message=(
            f"Your {subscription_name} subscription "
            f"expires on {expiry_date}."
        ),
        notification_type="subscription_expiry",
    )

    recipient_email, _ = _resolve_recipient_email(db, user_id, customer_id)

    delivered = False
    if recipient_email:
        try:
            subject, html = email_templates.subscription_expiry_email(
                subscription_name=subscription_name,
                expiry_date=expiry_date,
            )
            delivered = send_email(recipient_email, subject, html)
        except Exception:
            delivered = False

    return _mark_notification_send_result(db, notification, delivered)


# ==========================================================
# Backward-Compatible Database Wrappers
# ==========================================================

def notify_invoice_created(
    db: Session,
    customer_email: str,
    invoice_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
) -> Notification:
    """
    Backward-compatible wrapper for invoice notifications.
    """

    return send_invoice_notification(
        db=db,
        customer_email=customer_email,
        invoice_id=invoice_id,
        user_id=user_id,
        customer_id=customer_id,
    )


def notify_payment_success(
    db: Session,
    payment_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
) -> Notification:
    """
    Backward-compatible wrapper for payment-success notifications.
    """

    return send_payment_success_notification(
        db=db,
        payment_id=payment_id,
        user_id=user_id,
        customer_id=customer_id,
    )


def notify_payment_failed(
    db: Session,
    payment_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
) -> Notification:
    """
    Backward-compatible wrapper for payment-failed notifications.
    """

    return send_payment_failed_notification(
        db=db,
        payment_id=payment_id,
        user_id=user_id,
        customer_id=customer_id,
    )


def notify_invoice_overdue(
    db: Session,
    customer_email: str,
    invoice_id: int,
    user_id: int | None = None,
    customer_id: int | None = None,
) -> Notification:
    """
    Backward-compatible wrapper for overdue invoice notifications.
    """

    return send_invoice_overdue_notification(
        db=db,
        customer_email=customer_email,
        invoice_id=invoice_id,
        user_id=user_id,
        customer_id=customer_id,
    )


def notify_subscription_expiry(
    db: Session,
    subscription_name: str,
    expiry_date: str,
    user_id: int | None = None,
    customer_id: int | None = None,
) -> Notification:
    """
    Backward-compatible wrapper for subscription expiry notifications.
    """

    return send_subscription_expiry_notification(
        db=db,
        subscription_name=subscription_name,
        expiry_date=expiry_date,
        user_id=user_id,
        customer_id=customer_id,
    )
