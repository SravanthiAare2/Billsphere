# BillSphere – SaaS Subscription & Billing Management Platform

BillSphere is a full-stack SaaS Subscription and Billing Management Platform designed to automate the complete subscription lifecycle — from customer registration and plan selection to payment processing, invoice generation, subscription renewals, notifications, and administrative monitoring.

The platform provides separate experiences for **Customers** and **Administrators**, with a centralized billing engine and background processing architecture for recurring billing operations.

---

## 📌 Project Overview

BillSphere is built as a modern billing automation system inspired by platforms such as Stripe Billing and Chargebee.

The platform enables businesses to:

- Create and manage subscription plans
- Manage customers
- Handle recurring subscriptions
- Process payments
- Generate invoices
- Track payment history
- Handle subscription renewals
- Manage failed payments and retries
- Calculate billing-cycle changes and prorations
- Generate PDF invoices
- Send billing-related notifications
- Monitor customers and subscriptions through an Admin Dashboard
- Provide customers with a complete billing dashboard

The project combines a **React frontend**, **FastAPI backend**, **PostgreSQL database**, and **Celery + Redis background processing**.

---

# 🎯 Project Goals

The main objectives of BillSphere are:

- Automate recurring subscription billing
- Provide a simple and professional customer billing experience
- Centralize subscription and payment management
- Reduce manual billing operations
- Provide administrators with complete visibility into customer activity
- Automate invoice generation and billing events
- Support reliable payment retry and recovery workflows
- Maintain structured billing and subscription records

---

# ✨ Key Features

## 🔐 Authentication & Authorization

BillSphere provides secure authentication for users.

Features include:

- User registration
- User login
- JWT-based authentication
- Authentication middleware
- Current-user retrieval
- Token refresh
- Role-based access
- Customer and Admin experiences
- Google authentication integration

---

# 👤 Customer Dashboard

Customers receive a dedicated dashboard to manage their billing activities.

The Customer Dashboard provides access to:

- Account overview
- Current subscription
- Available plans
- Billing information
- Payment information
- Invoice history
- Payment history
- Usage information
- Notifications
- Account settings
- Help & Support

The dashboard is designed around the complete customer billing lifecycle.

---

# 🛡️ Admin Dashboard

The Admin Dashboard provides administrators with centralized visibility into the billing platform.

Administrators can monitor:

- Customers
- Subscription activity
- Subscription plans
- Payments
- Invoices
- Billing activity
- Payment status
- Failed payments
- Customer activity
- Support information
- Platform-level billing operations

The Admin Dashboard is designed to reflect customer activity from the billing system in a centralized administrative view.

---

# 📦 Subscription Management

BillSphere supports the complete subscription lifecycle.

Supported operations include:

- Create subscription
- View subscription
- Update subscription
- Cancel subscription
- Subscription status tracking
- Billing cycle management
- Trial periods
- Subscription history
- Renewal processing
- Plan upgrades
- Plan changes
- Subscription-related notifications

### Subscription States

Typical subscription states include:

- `trialing`
- `active`
- `past_due`
- `cancelled`
- `expired`

---

# 💳 Plans & Pricing

BillSphere supports multiple subscription plans for different platforms/business use cases.

The platform supports three primary pricing tiers:

| Plan | Price | Billing |
|------|------:|---------|
| Basic | ₹499 | Monthly |
| Standard | ₹1,499 | Monthly |
| Premium | ₹4,999 | Monthly |

Plans can contain:

- Platform
- Plan name
- Description
- Price
- Currency
- Billing cycle
- Trial period
- Feature entitlements
- Customer limits
- Invoice limits
- Active/inactive status

The Plans page retrieves plan information from the backend and organizes plans by platform.

---

# 💰 Billing Engine

The BillSphere billing engine is responsible for automating recurring billing operations.

Core responsibilities include:

- Billing-cycle calculations
- Subscription renewal processing
- Invoice generation
- Payment processing
- Payment status updates
- Trial-to-paid conversion
- Billing history
- Subscription state transitions

---

# 🔄 Recurring Billing

BillSphere is designed to support recurring subscription billing.

A typical recurring billing cycle is:

```text
Customer
   ↓
Select Plan
   ↓
Create Subscription
   ↓
Billing Cycle Starts
   ↓
Invoice Generated
   ↓
Payment Attempt
   ↓
Payment Successful
   ↓
Subscription Remains Active
   ↓
Next Billing Cycle
   ↓
Invoice Generated
   ↓
Payment Attempt

💳 Payment Management

BillSphere provides payment management functionality for customer subscriptions.

The platform tracks:

Payment amount
Payment status
Payment date
Related customer
Related subscription
Related invoice
Payment method/reference
Transaction information

Typical payment states include:

Pending
Successful
Failed
Refunded
📧 Payment Confirmation Flow

The platform supports a confirmation-based payment workflow.

A simplified flow is:

Customer selects plan
        ↓
Payment submitted
        ↓
Payment confirmation
        ↓
Payment verified
        ↓
Subscription activated
        ↓
Invoice generated
        ↓
Confirmation notification

This workflow helps maintain consistency between payment status and subscription status.

🧾 Invoice Management

BillSphere provides invoice management for subscription billing.

Invoices can contain:

Invoice number
Customer information
Subscription information
Plan information
Billing period
Amount
Tax
Total amount
Due date
Payment status
Payment information

Invoices are stored and associated with the appropriate customer and subscription.

📄 PDF Invoice Generation

BillSphere supports PDF invoice generation.

PDF invoices are generated from billing information and can include:

Customer details
Invoice details
Subscription details
Billing period
Charges
Taxes
Total amount
Payment status

The backend uses ReportLab for PDF invoice generation.

🔁 Failed Payment Recovery

BillSphere includes a payment recovery / dunning workflow for failed payments.

A retry strategy can follow a schedule such as:

Initial Payment Attempt
        ↓
Payment Failed
        ↓
Retry – Day 1
        ↓
Retry – Day 3
        ↓
Retry – Day 7
        ↓
Successful → Subscription Continues
        OR
Failed → Subscription Becomes Past Due / Cancelled

This reduces the impact of temporary payment failures.

📈 Proration

BillSphere supports billing adjustments when customers change subscriptions during an active billing period.

Examples include:

Plan upgrade
Plan downgrade
Mid-cycle plan changes
Remaining-period calculations
Additional charges
Credits

Proration ensures that customers are charged fairly when subscription changes occur before the end of a billing cycle.

🧮 Tax & Billing Calculations

The billing system is designed to support tax-aware billing calculations.

Possible billing components include:

Base Subscription Amount
        +
Additional Charges
        -
Credits / Proration Adjustments
        +
Applicable Taxes
        =
Final Invoice Amount

The system can be extended to support country- and region-specific tax rules.

🔔 Notifications

BillSphere includes notification functionality for important billing events.

Notification scenarios can include:

Subscription created
Payment successful
Payment failed
Invoice generated
Subscription renewed
Subscription cancelled
Payment retry
Account-related events

Email notifications are supported through SMTP configuration.

📊 Usage Tracking

Customers can view usage-related information through the dashboard.

Usage information can be used to monitor:

Customer limits
Invoice limits
Subscription entitlements
Platform usage
Plan-specific limits

This provides customers with visibility into their current subscription utilization.

🆘 Help & Support

BillSphere provides customer support functionality through the dashboard.

Customers can access:

Help & Support
Support information
Billing-related assistance
Account assistance

Administrators can manage support-related information from the Admin Dashboard.

🔔 Notification Center

Customers can access billing notifications from the dashboard.

The notification system can surface events such as:

Successful payments
Failed payments
New invoices
Subscription changes
Renewal events
Account updates
⚙️ Settings

Customers can manage account-related settings through the Settings section.

The Settings area is designed to provide access to:

Profile information
Account information
Billing preferences
Notification preferences
Authentication-related settings
🏗️ System Architecture

BillSphere follows a layered full-stack architecture.

                        ┌───────────────────────┐
                        │      Customer         │
                        │       Browser         │
                        └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    React Frontend     │
                        │      Vite + TS        │
                        └───────────┬───────────┘
                                    │
                              REST API
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │    FastAPI Backend    │
                        │      Python           │
                        └───────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       ┌─────────────┐       ┌─────────────┐      ┌─────────────┐
       │ PostgreSQL  │       │   Celery    │      │    Redis    │
       │  Database   │       │   Workers   │      │   Broker    │
       └─────────────┘       └─────────────┘      └─────────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ Background Billing    │
                        │ & Scheduled Tasks      │
                        └───────────────────────┘
🧰 Technology Stack
Frontend
React
TypeScript
Vite
React Router
CSS
REST API integration
Backend
Python
FastAPI
SQLAlchemy
Pydantic
JWT Authentication
REST APIs
Database
PostgreSQL
Background Processing
Celery
Redis
Scheduled billing tasks
PDF Generation
ReportLab
Email
SMTP
Gmail SMTP configuration
Development Tools
Git
GitHub
VS Code
Swagger / OpenAPI
Docker
🗂️ Project Structure
BillSphere/
│
├── backend/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py
│   │   │   ├── customers.py
│   │   │   ├── plans.py
│   │   │   ├── subscriptions.py
│   │   │   └── schedule.py
│   │   │
│   │   ├── core/
│   │   │
│   │   ├── database/
│   │   │
│   │   ├── models/
│   │   │
│   │   ├── schemas/
│   │   │
│   │   ├── services/
│   │   │
│   │   ├── workers/
│   │   │
│   │   ├── scripts/
│   │   │
│   │   ├── celery_app.py
│   │   ├── tasks.py
│   │   ├── email_tasks.py
│   │   └── main.py
│   │
│   ├── generated/
│   │   └── invoices/
│   │
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Plans.tsx
│   │   │   ├── CustomerDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── Billing.tsx
│   │   │   ├── Payment.tsx
│   │   │   ├── PaymentConfirmation.tsx
│   │   │   ├── PaymentHistory.tsx
│   │   │   ├── Notifications.tsx
│   │   │   ├── Usage.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── HelpSupport.tsx
│   │   │   └── AdminSupport.tsx
│   │   │
│   │   ├── services/
│   │   │   └── api.ts
│   │   │
│   │   ├── style.css
│   │   └── ...
│   │
│   ├── package.json
│   └── ...
│
└── README.md
🗄️ Database Design

The backend uses PostgreSQL with SQLAlchemy ORM.

Major entities include:

User
 │
 └── Customer
       │
       └── Subscription
              │
              ├── Plan
              │
              ├── Invoice
              │      │
              │      └── Payment
              │
              └── Billing Cycle

Additional billing-related entities include:

Users
Customers
Plans
Subscriptions
Invoices
Payments
Payment Retries
Subscription History
Billing Cycles
🔌 API Architecture

The backend exposes REST APIs under:

/api/v1
Authentication
POST   /api/v1/auth/register
POST   /api/v1/auth/login
GET    /api/v1/auth/me
POST   /api/v1/auth/refresh
Customers
/api/v1/customers/customers
Plans
/api/v1/plans/plans
Subscriptions
/api/v1/subscriptions/subscriptions
Invoices
/api/v1/invoices/invoices
Payments
GET    /api/v1/payments/payments/

The API is documented using OpenAPI/Swagger.

📚 API Documentation

When the backend is running, Swagger UI is available at:

http://127.0.0.1:8000/docs

ReDoc is available at:

http://127.0.0.1:8000/redoc
🔐 Security

BillSphere uses several security mechanisms.

These include:

JWT authentication
Password hashing
Protected API routes
Authentication middleware
Role-based access
Request validation
Pydantic schemas
Database constraints
Environment-based secrets

Sensitive credentials should never be committed to GitHub.

⚙️ Environment Configuration

Create an environment configuration file for the backend.

Example:

DATABASE_URL=postgresql://username:password@localhost:5432/billsphere


SECRET_KEY=your-secret-key


REDIS_URL=redis://localhost:6379/0


CELERY_BROKER_URL=redis://localhost:6379/0


MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password

Never commit actual passwords, API keys, JWT secrets, or other credentials.

🐍 Backend Setup

Navigate to the backend:

cd backend

Activate the Python environment used for the project.

If using the project environment:

.\.venv\Scripts\Activate.ps1

Install dependencies:

pip install -r requirements.txt
🗄️ PostgreSQL Setup

Make sure PostgreSQL is installed and running.

Create the BillSphere database:

CREATE DATABASE billsphere;

Update the database configuration with the correct PostgreSQL credentials.

🔴 Redis Setup

Redis is required for Celery background processing.

Using Docker:

docker run --name billsphere-redis -p 6379:6379 -d redis:7-alpine

Verify Redis:

docker exec -it billsphere-redis redis-cli ping

Expected output:

PONG
🚀 Start the Backend

From the backend directory:

python -m uvicorn app.main:app --reload

The backend will run at:

http://127.0.0.1:8000

Swagger:

http://127.0.0.1:8000/docs
⚡ Start Celery Worker

From the backend directory:

celery -A app.celery_app worker --loglevel=info

Depending on the configured Celery application path, use the import path defined in the project.

⏰ Start Celery Beat

For scheduled billing operations:

celery -A app.celery_app beat --loglevel=info

Celery Beat can be used for scheduled operations such as:

Subscription renewals
Invoice generation
Payment retries
Billing-cycle processing
Subscription status updates
⚛️ Frontend Setup

Navigate to the frontend:

cd frontend

Install dependencies:

npm install

Start the development server:

npm run dev

The frontend will normally be available at:

http://localhost:5173
🔄 Customer Billing Flow

The complete customer experience can be represented as:

Landing Page
      ↓
Register / Login
      ↓
Customer Dashboard
      ↓
Plans
      ↓
Select Subscription
      ↓
Confirm Subscription
      ↓
Payment
      ↓
Payment Confirmation
      ↓
Subscription Activated
      ↓
Invoice Generated
      ↓
Customer Dashboard
      ↓
Billing / Payment History
👨‍💼 Admin Billing Flow

The administrator workflow is:

Admin Login
     ↓
Admin Dashboard
     ↓
Customers
     ↓
Subscriptions
     ↓
Plans
     ↓
Payments
     ↓
Invoices
     ↓
Billing Activity
     ↓
Support / Monitoring
🔄 Subscription Lifecycle
                 ┌─────────────┐
                 │   Trialing  │
                 └──────┬──────┘
                        │
                 Payment Successful
                        │
                        ▼
                 ┌─────────────┐
                 │    Active   │
                 └──────┬──────┘
                        │
                  Payment Failed
                        │
                        ▼
                 ┌─────────────┐
                 │  Past Due   │
                 └──────┬──────┘
                        │
                 Retry Successful
                        │
                        ▼
                 ┌─────────────┐
                 │    Active   │
                 └─────────────┘


Past Due
   │
   └── Retry Attempts Exhausted
              ↓
        ┌─────────────┐
        │  Cancelled  │
        └─────────────┘
🧪 Testing

The project supports testing of billing-related functionality.

Important testing areas include:

Authentication
Customer operations
Plan operations
Subscription creation
Subscription updates
Subscription cancellation
Invoice generation
Payment processing
Payment failures
Payment retries
Billing calculations
Webhook processing
Background tasks

Tests can be executed using:

pytest

Focused tests can be executed using:

pytest -v
🧠 Billing Automation

BillSphere is designed around automated billing operations.

The automation layer can handle:

Subscription
     ↓
Billing Cycle
     ↓
Invoice Creation
     ↓
Payment Attempt
     ↓
       ┌───────────────┐
       │               │
    SUCCESS          FAILED
       │               │
       ▼               ▼
Subscription       Retry/Dunning
 Active                 │
                        ▼
                  Next Retry
                        │
                        ▼
                 Final Outcome
📦 Plan Seeder

BillSphere includes a plan seeding mechanism for initializing subscription plans.

The intended structure is:

Platform
 ├── Basic
 ├── Standard
 └── Premium

The seeder is designed to be idempotent so that running it multiple times does not create duplicate plans.

Example:

python -m app.scripts.seed_plans
🐳 Docker Support

Docker can be used to run supporting services such as Redis and to create reproducible development environments.

Example Redis container:

docker run --name billsphere-redis -p 6379:6379 -d redis:7-alpine

The project can be extended with Docker Compose to orchestrate:

Backend
Frontend
PostgreSQL
Redis
Celery Worker
Celery Beat
🌐 Git Branching Strategy

The Springboard Internship repository uses individual branches for contributors.

For this project, the working branch is:

Sravanthi

The general workflow is:

Local BillSphere
       ↓
Sravanthi Branch
       ↓
Commit Changes
       ↓
Push to Springboard Repository
       ↓
Pull Request
       ↓
main

Do not directly push development changes to the shared main branch.

🔀 Git Commands

Add changes:

git add .

Commit:

git commit -m "Update BillSphere billing features"

Push to the Springboard branch:

git push springboard Sravanthi

Check branch:

git branch

Check remotes:

git remote -v
📈 Project Status
Completed / Implemented
 FastAPI backend
 PostgreSQL database
 SQLAlchemy ORM
 JWT authentication
 User registration
 User login
 Customer management
 Subscription plans
 Subscription APIs
 Invoice APIs
 Payment APIs
 Customer Dashboard
 Admin Dashboard
 Plans page
 Billing page
 Payment page
 Payment confirmation
 Payment history
 Notifications
 Usage page
 Settings
 Help & Support
 Admin Support
 PDF invoice generation
 Email notification structure
 Celery integration
 Redis integration
 Swagger/OpenAPI documentation
In Progress / Continuous Improvement
 Complete production-grade payment gateway integration
 Complete webhook processing
 Expand automated billing-cycle processing
 Expand automated payment retry engine
 Complete advanced tax rules
 Expand billing analytics
 Expand automated monitoring
 Production deployment
🚀 Future Enhancements

Potential future improvements include:

Stripe/Razorpay payment gateway integration
Payment webhooks
Automated refund processing
Advanced revenue analytics
Monthly recurring revenue (MRR)
Annual recurring revenue (ARR)
Customer lifetime value (CLV)
Churn analytics
Revenue forecasting
Advanced tax engine
Multi-currency billing
Multi-tenant architecture
Advanced role-based access control
Audit logging
Production monitoring
CI/CD pipeline
Cloud deployment
Automated database backups
📊 Business Metrics

The architecture can be extended to calculate important SaaS billing metrics such as:

Monthly Recurring Revenue (MRR)
MRR = Sum of active monthly subscription revenue
Annual Recurring Revenue (ARR)
ARR = MRR × 12
Customer Churn
Churn Rate =
Cancelled Customers / Customers at Start of Period
Customer Lifetime Value
CLV ≈ Average Revenue per Customer × Average Customer Lifetime

These metrics can be incorporated into future Admin Dashboard analytics.

🧩 Design Principles

BillSphere follows these development principles:

Modular backend architecture
Separation of concerns
RESTful API design
Database normalization
Reusable frontend components
Secure authentication
Input validation
Background task processing
Idempotent billing operations
Maintainable code structure
Scalable billing architecture
🔒 Security Notes

Never commit the following files or information:

.env
API keys
Database passwords
JWT secrets
SMTP passwords
Payment credentials
Private certificates
Production credentials

Use environment variables for sensitive configuration.

👩‍💻 Development Workflow

A typical development workflow is:

1. Create / update feature
        ↓
2. Run backend
        ↓
3. Run frontend
        ↓
4. Test API through Swagger
        ↓
5. Test customer workflow
        ↓
6. Test admin workflow
        ↓
7. Run automated tests
        ↓
8. Review changes
        ↓
9. Commit changes
        ↓
10. Push to Sravanthi branch
        ↓
11. Create Pull Request
📌 Project Information

Project Name: BillSphere

Project Type: SaaS Subscription & Billing Management Platform

Domain: SaaS / FinTech / Billing Automation

Architecture: Full Stack

Backend: FastAPI + Python

Frontend: React + TypeScript + Vite

Database: PostgreSQL

Background Processing: Celery + Redis

Invoice Generation: ReportLab

Authentication: JWT + Google Authentication

API Style: REST

🎓 Internship Context

BillSphere is being developed as part of the Springboard Internship 2026 project:

Recurring Revenue / Subscription / Billing Automation Platform

The project focuses on implementing a practical SaaS billing platform covering subscription management, recurring revenue workflows, billing automation, payment handling, invoice generation, and administrative monitoring.

👥 Contributors
Sravanthi Aare

Full-stack development, billing workflows, customer dashboard, admin dashboard, subscription management, payment flow, invoice management, authentication, frontend integration, and backend development.

Springboard Internship Team

Project collaboration, mentoring, repository management, and internship coordination.

📄 License

This project is developed for educational and internship purposes.

All rights reserved unless otherwise specified by the project organization.

⭐ BillSphere

BillSphere — Simplifying SaaS Billing, Subscriptions & Recurring Revenue.

Manage Customers.
Manage Subscriptions.
Automate Billing.
Track Payments.
Generate Invoices.
Monitor Revenue.