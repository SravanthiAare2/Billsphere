# Recurring-Revenue--Subscription---Billing-Automation-Platform-July-2026

This repository implements a Recurring Revenue / Subscription / Billing Automation platform for the July 2026 Springboard internship.

## Goal for this iteration
- Complete the subscription module (models, APIs, billing logic, webhooks, and tests).
- Provide a Docker-based development and orchestration setup for Celery (task queue) and Redis (broker).

## Subscription module checklist (what to add / verify)
Use this checklist to complete the subscription module. Each item should be implemented and covered by tests before marking done.

- Models and DB
  - Subscription model: customer, plan, status (active/past_due/cancelled), start_date, end_date, trial_end, metadata
  - Plan model: name, price, billing_interval (month/year), features, trial_period_days
  - Invoice model: amount, due_date, paid, subscription_id, attempt_count
  - Payment method model or integration reference (payment tokens)
  - Migrations created and applied

- Business logic and billing
  - Prorations and billing-cycle calculations
  - Automatic invoice creation on billing cycle
  - Retry / dunning logic for failed payments
  - Cancel at period end vs immediate cancel
  - Trial handling and conversion to paid

- APIs and integration
  - Endpoints to create/update/cancel subscriptions
  - Webhook endpoints to receive events from payment providers (success, failed, chargeback)
  - Proper validation and permissions

- Background jobs
  - Celery tasks for invoice generation, retry attempts, subscription status updates, webhook processing
  - Idempotency for tasks that can be retried or re-delivered

- Tests
  - Unit tests for models and billing logic
  - Integration tests for webhook flows and background task processing

- Monitoring & logging
  - Instrument important task failures and add logs for billing events
  - Alerts for repeated payment failures

## Running with Docker, Celery and Redis
The recommended development flow is to run Redis as the broker and use Celery workers for background jobs. Below are steps and examples to get you started.

Prerequisites
- Docker installed (https://docs.docker.com/get-docker/)
- docker-compose (optional but recommended)

1) Pull images (per repo maintainer request)

Run these commands on your machine where Docker is available:

```bash
# User requested: pull the celery image
docker pull celery

# Redis (broker)
docker pull redis:latest

# You will typically use a Python image for the app worker; pull if needed
docker pull python:3.10-slim
```

Note: There is not always an official single-purpose "celery" image with your app code baked in; commonly you run Celery from inside a Python image (or your application image) with Celery installed in the project's environment. The `docker pull celery` command will pull whatever image is available under that name on Docker Hub; for deterministic builds it's better to use a project-specific image (see docker-compose example below).

2) Example docker-compose for app + redis + celery worker

Create a `docker-compose.yml` at the repo root (example):

```yaml
version: '3.8'
services:
  redis:
    image: redis:latest
    container_name: rr_redis
    ports:
      - "6379:6379"

  web:
    build: .
    container_name: rr_web
    command: sh -c "pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000"
    volumes:
      - ./:/app
    working_dir: /app
    ports:
      - "8000:8000"
    depends_on:
      - redis

  worker:
    build: .
    container_name: rr_celery_worker
    command: sh -c "pip install -r requirements.txt && celery -A app.worker:celery_app worker --loglevel=info"
    volumes:
      - ./:/app
    working_dir: /app
    depends_on:
      - redis

  beat:
    build: .
    container_name: rr_celery_beat
    command: sh -c "pip install -r requirements.txt && celery -A app.worker:celery_app beat --loglevel=info"
    volumes:
      - ./:/app
    working_dir: /app
    depends_on:
      - redis

# Notes:
# - Replace `app.worker:celery_app` with the actual import path to your Celery app instance.
# - `build: .` assumes your Dockerfile will install your project and dependencies.
```

3) Running with docker-compose

```bash
# build images and start services
docker-compose up --build -d

# view logs
docker-compose logs -f worker

# stop services
docker-compose down
```

4) Running a Celery worker directly with Docker (one-off)

If you prefer to run a one-off worker (without docker-compose) and your project uses a Python environment, you can do:

```bash
# start redis (detached)
docker run -d --name rr_redis -p 6379:6379 redis:latest

# run a celery worker using the python image and your repo mounted
docker run --rm --name rr_celery_worker --link rr_redis:redis -v "$(pwd)":/app -w /app python:3.10-slim \
  sh -c "pip install -r requirements.txt && celery -A app.worker:celery_app worker --loglevel=info"
```

Replace `app.worker:celery_app` with your Celery app path (module:instance). If your project requires system-level libraries, create a proper Dockerfile for reproducibility.

5) Minimal Celery example (for local testing)

Create `app/worker.py`:

```python
from celery import Celery

celery_app = Celery(
    'rr_tasks',
    broker='redis://redis:6379/0',
    backend='redis://redis:6379/1'
)

@celery_app.task
def add(x, y):
    return x + y
```

Call the task from Python (for quick test):

```python
from app.worker import add
result = add.delay(2, 3)
print(result.get(timeout=10))  # should print 5
```

6) Environment variables and configuration
- Set CELERY_BROKER_URL to your Redis broker (e.g., redis://redis:6379/0) in your config/environment.
- Configure result backend if you need task results.
- Configure task serialization, time limits, and retry policies according to billing processing needs.

7) Next steps for the subscription module
- Implement the models and API endpoints listed above.
- Add Celery tasks for invoice generation and retry/dunning.
- Add integration tests that run against the docker-compose setup (CI can spin up redis via services or testcontainers / ephemeral redis).

Contributors: update this README with concrete module names and Celery import paths once the subscription module code is in place.

---

If you'd like, I can:
- Add the `docker-compose.yml` file to the repo with the example above.
- Add a simple `app/worker.py` test file and a sample Celery task.
- Open a PR with the subscription module checklist converted to GitHub Issues.

