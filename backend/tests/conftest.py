"""
BillSphere Test Configuration

Provides:
- Test database setup
- FastAPI TestClient
- Database dependency override
- Authentication helpers
"""

import os

import pytest

from sqlalchemy import create_engine

from sqlalchemy.orm import (
    sessionmaker,
)

from fastapi.testclient import (
    TestClient,
)


from app.main import app

from app.core.database import (
    Base,
    get_db,
)

from app.core.security import (
    create_access_token,
)



# ==========================================================
# Test Database
# ==========================================================

TEST_DATABASE_URL = (
    "sqlite:///./test_billsphere.db"
)



engine = create_engine(

    TEST_DATABASE_URL,

    connect_args={
        "check_same_thread": False
    },

)



TestingSessionLocal = sessionmaker(

    autocommit=False,

    autoflush=False,

    bind=engine,

)



# ==========================================================
# Database Fixture
# ==========================================================

@pytest.fixture()
def db_session():

    Base.metadata.create_all(
        bind=engine
    )


    database = TestingSessionLocal()


    try:

        yield database


    finally:

        database.close()


        Base.metadata.drop_all(
            bind=engine
        )



# ==========================================================
# Override Database Dependency
# ==========================================================

def override_database():

    database = TestingSessionLocal()


    try:

        yield database


    finally:

        database.close()



app.dependency_overrides[
    get_db
] = override_database



# ==========================================================
# API Client Fixture
# ==========================================================

@pytest.fixture()
def client():

    with TestClient(
        app
    ) as test_client:

        yield test_client



# ==========================================================
# Authentication Token Fixture
# ==========================================================

@pytest.fixture()
def auth_headers():

    token = create_access_token(

        {
            "sub":
            "1"

        }

    )


    return {

        "Authorization":
        f"Bearer {token}"

    }



# ==========================================================
# Cleanup
# ==========================================================

@pytest.fixture(
    autouse=True
)
def cleanup_database():

    yield


    if os.path.exists(
        "test_billsphere.db"
    ):

        os.remove(
            "test_billsphere.db"
        )