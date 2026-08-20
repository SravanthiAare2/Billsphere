# BillSphere Backend

Recurring Payment, Subscription Management & Billing Automation Platform.

## Technology

- Python 3.12+
- FastAPI
- PostgreSQL
- SQLAlchemy 2
- Alembic
- Celery + Redis + Celery Beat
- ReportLab
- Pydantic v2
- Locust

## Completed backend milestones

### Weeks 1-2
- Subscription plans with monthly/annual billing
- Trial configuration and feature entitlements
- Customer management
- Subscription lifecycle state machine
- Trial → active → past_due → cancelled
- Trial → cancelled
- Pause/resume
- Immediate cancellation
- Cancel at period end
- Subscription history
- Audit logs
- Billing-cycle records
- Automatic renewal-date calculation
- Celery Beat scheduling

### Weeks 3-4
- Real invoice line items
- Subscription charge lines
- Usage charge lines
- Proration debit/credit
- Tax line items
- Unique invoice numbers
- Mock payment gateway
- Configurable payment success rate
- paid/failed/refunded webhooks
- Webhook idempotency using event IDs
- Invoice/payment synchronization
- Payment success/failure lifecycle synchronization
- Refund processing
- Unused-period refund support

### Weeks 5-6
- Failed payment dunning
- Day 1 / Day 3 / Day 7 retries
- Automatic retry attempts
- Subscription cancellation after exhausted retries
- Country-based configurable tax rates
- India CGST/SGST/IGST support
- Tax summary report
- ReportLab PDF invoices
- Itemized invoice PDFs
- MRR analytics
- Churn rate
- Trial conversion rate
- Revenue by plan
- Invoice status analytics
- Failed payment queue
- Notification/audit infrastructure

### Weeks 7-8 backend
- Integration-test suite
- Locust load-test script
- Docker Compose with PostgreSQL, Redis, API, Celery worker and Celery Beat
- Alembic migration
- OpenAPI/Swagger documentation
- Production-oriented configuration
- `.env.example`
- Security-sensitive `.env` excluded from this archive

## Important API groups

All APIs are under `/api/v1`.

- `/auth`
- `/customers`
- `/plans`
- `/subscriptions`
- `/billing-cycles`
- `/invoices`
- `/payments`
- `/payment-retries`
- `/webhooks`
- `/usage`
- `/audit-logs`
- `/analytics`
- `/reports`
- `/notifications`
- `/users`

## Important workflow

```text
Customer
   ↓
Plan
   ↓
Subscription
   ↓
Billing Cycle
   ↓
Renewal Scheduler
   ↓
Invoice
   ├── Subscription Line
   ├── Usage Lines
   ├── Proration Lines
   └── Tax Lines
   ↓
Mock Payment Gateway
   ├── Paid → Invoice Paid → Subscription Active
   └── Failed → Past Due → Retry Day 1 → Day 3 → Day 7
                                      ↓
                                  Cancelled
```

## Local setup

### 1. Create virtual environment

Windows:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\activate
```

### 2. Install packages

```powershell
python -m pip install -r requirements.txt
```

### 3. Configure environment

Copy:

```text
.env.example → .env
```

Set your local PostgreSQL password and database URL.

### 4. Start PostgreSQL and Redis

Make sure:

```text
PostgreSQL → localhost:5432
Redis      → localhost:6379
```

Or use Docker:

```powershell
docker compose up -d db redis
```

### 5. Apply migrations

```powershell
alembic upgrade head
```

### 6. Start API

```powershell
uvicorn app.main:app --reload
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

### 7. Start Celery worker

Windows development:

```powershell
celery -A app.workers.celery_app worker --loglevel=info --pool=solo
```

### 8. Start Celery Beat

In another terminal:

```powershell
celery -A app.workers.celery_app beat --loglevel=info
```

Celery Beat schedules:

- Subscription renewal check: every 15 minutes
- Payment retry check: every hour

## Invoice line items

Invoices now use the actual `invoice_line_items` table.

Example:

```json
[
  {
    "id": 1,
    "invoice_id": 10,
    "description": "Professional Plan subscription",
    "item_type": "subscription",
    "amount": "999.00"
  },
  {
    "id": 2,
    "invoice_id": 10,
    "description": "API usage x100",
    "item_type": "usage",
    "amount": "100.00"
  },
  {
    "id": 3,
    "invoice_id": 10,
    "description": "CGST (9.0%)",
    "item_type": "tax_cgst",
    "amount": "98.91"
  },
  {
    "id": 4,
    "invoice_id": 10,
    "description": "SGST (9.0%)",
    "item_type": "tax_sgst",
    "amount": "98.91"
  }
]
```

## Main testing flow

1. Register/login.
2. Create customer.
3. Create plan.
4. Create subscription.
5. Verify billing cycle.
6. Activate trial.
7. Create/generate invoice.
8. Verify invoice line items.
9. Create payment.
10. Call mock gateway or payment success endpoint.
11. Verify invoice becomes `paid`.
12. Test failed payment.
13. Verify subscription becomes `past_due`.
14. Inspect `/payment-retries`.
15. Run retry task.
16. Test webhook events.
17. Test plan change/proration.
18. Test refund.
19. Download invoice PDF.
20. Verify analytics and audit logs.

## Load testing

Locust script:

```text
app/loadtest/locustfile.py
```

Example:

```powershell
locust -f app/loadtest/locustfile.py
```

## Security

Do not commit:

- `.env`
- database passwords
- SMTP passwords
- JWT secrets
- production API keys

Use `.env.example` as the safe configuration template.

## Database note

The backend uses `Base.metadata.create_all()` for local development compatibility, but Alembic is the recommended migration mechanism:

```powershell
alembic upgrade head
```

The latest migration adds compatibility for:

- `invoice_line_items`
- `plans.feature_entitlements`

## Milestone status

Backend implementation is structured around the supplied 8-week project specification. The React dashboard can consume the analytics, invoice, payment-retry, audit, report and billing-cycle APIs directly.
