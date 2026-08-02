# Billing Automation Platform (BillPlatform)

A robust and secure billing automation and digital subscription tracking platform. Built with a modern **FastAPI** backend, **SQLAlchemy ORM** for database interaction, and a responsive **Vanilla HTML/CSS/JS** frontend.

---

## Features

###  1. Authentication & Security
- **Secure Register & Login**: Leverages bcrypt password hashing and JWT (JSON Web Tokens) for stateful session checks.
- **Admin Bootstrapping**: A dedicated endpoint `/auth/bootstrap-admin` for initializing the first admin account safely.
- **Role-Based Access Control**: Standard user operations are guarded against admin operations (e.g., standard users cannot read database logs or change status of other users).

### 2. Customer Dashboard (`/customer`)
- **Visual Spend Analytics**: Automatically calculates and tracks monthly spend, estimated annual bills, and lists pending payments.
- **Plan Actions**: Allows customers to view their active digital subscriptions (e.g., Netflix, Spotify, Prime Video), pause/resume them, or add custom streaming/service bills.
- **Account Settings**: Customers can update their details (name, password) securely.

###  3. Admin Security Console (`/admin`)
- **User Directory**: List all registered customer accounts with statuses (Active/Deactivated).
- **Accounts Provisioning**: Admin can provision new customer or administrator accounts with custom passwords.
- **Plan Management**: Admin can add, modify pricing, rename plans, or delete subscriptions for any customer directly.

###  4. Dedicated Subscriptions API (`/subscriptions`)
- Structured, separate CRUD API design to retrieve and edit user subscriptions.
- Documented in Swagger UI with specific request/response models.

---

##  Tech Stack

- **Backend**: Python 3.13+, FastAPI, Uvicorn
- **Database**: PostgreSQL (Production) / SQLite (isolated unit testing), SQLAlchemy ORM, Alembic (Migrations)
- **Frontend**: Vanilla HTML5, CSS3, modern JavaScript (Modular API Clients, Inter font family)
- **Testing**: Pytest, FastAPI TestClient

---

## Folder Structure

```text
billing-platform/
│
├── app/                        # FastAPI Backend Code
│   ├── api/                    # Routers (auth.py, subscriptions.py)
│   ├── config/                 # Pydantic Settings management
│   ├── core/                   # Security (JWT configuration, password hashing)
│   ├── database/               # DB session and setup scripts
│   ├── models/                 # SQLAlchemy models (user.py)
│   ├── schemas/                # Pydantic schemas (auth.py, subscription.py)
│   ├── repositories/           # DB query layer
│   └── main.py                 # App entrypoint and static file mounting
│
├── frontend/                   # Frontend Files (Mounted at root '/')
│   ├── css/                    # Custom CSS stylesheets
│   ├── js/                     # Custom JS scripts
│   ├── index.html              # Sign-In / Register Portal
│   ├── customer.html           # Customer Dashboard
│   └── admin.html              # Admin Console
│
├── tests/                      # Testing Suite
│   ├── test_auth.py            # Authentication & Access tests
│   └── test_subscriptions.py   # Subscriptions CRUD API tests
│
├── alembic/                    # Migration scripts and environment configuration
├── requirements.txt            # Python dependencies
├── pytest.ini                  # Pytest runner configuration
└── alembic.ini                 # Alembic configuration
```

---

##  Getting Started

### 1. Prerequisites
- Python 3.12+ installed
- PostgreSQL database running (or adjust connection in `.env` to use another database engine)

### 2. Installation
Clone the repository and install the dependencies in a virtual environment:

```bash
# Set up virtual environment
python -m venv venv
venv\Scripts\activate      # On Windows (cmd/powershell)
source venv/bin/activate  # On macOS/Linux

# Install required libraries
pip install -r requirements.txt
```

### 3. Environment Configuration
Create a `.env` file in the root directory based on the `.env.example` template:

```ini
APP_NAME=Billing Automation Platform
ENVIRONMENT=development
DATABASE_URL=postgresql+psycopg2://postgres:password@localhost:5432/billing_db
SECRET_KEY=generate-a-long-secure-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 4. Running the Database Migrations
On startup, the application database initialization script runs `create_all` automatically. If you want to use Alembic for custom migration histories:

```bash
alembic upgrade head
```

### 5. Running the Dev Server
Start the Uvicorn local development server:

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` in your browser to view the interactive FastAPI documentation (Swagger UI). Open `http://127.0.0.1:8000/` to access the login page.

---

##  Testing

The test suite uses an in-memory SQLite database for maximum speed and complete isolation. Run the verification tests using the following command:

```bash
pytest
```