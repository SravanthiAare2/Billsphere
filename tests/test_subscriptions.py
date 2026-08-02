import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base, get_db
from app.main import app
from app.models.user import UserRole

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


def test_subscriptions_api_lifecycle(client: TestClient):
    # 1. Unauthenticated checks
    resp = client.get("/subscriptions/1")
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"

    resp = client.put("/subscriptions/1", json={"subscriptions": "[]"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Not authenticated"

    # 2. Bootstrap Admin
    admin_data = {
        "email": "admin@example.com",
        "full_name": "System Admin",
        "password": "AdminPassword123!",
    }
    client.post("/auth/bootstrap-admin", json=admin_data)
    admin_login = client.post(
        "/auth/login",
        data={"username": "admin@example.com", "password": "AdminPassword123!"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # 3. Create customer user
    customer_data = {
        "email": "customer@example.com",
        "full_name": "Jane Customer",
        "password": "CustomerPassword123!",
    }
    reg_resp = client.post("/auth/register", json=customer_data)
    customer_id = reg_resp.json()["id"]

    cust_login = client.post(
        "/auth/login",
        data={"username": "customer@example.com", "password": "CustomerPassword123!"},
    )
    customer_headers = {"Authorization": f"Bearer {cust_login.json()['access_token']}"}

    # Create another customer user to test unauthorized access
    other_customer_data = {
        "email": "other@example.com",
        "full_name": "Other Customer",
        "password": "CustomerPassword123!",
    }
    other_reg_resp = client.post("/auth/register", json=other_customer_data)
    other_customer_id = other_reg_resp.json()["id"]

    other_cust_login = client.post(
        "/auth/login",
        data={"username": "other@example.com", "password": "CustomerPassword123!"},
    )
    other_customer_headers = {"Authorization": f"Bearer {other_cust_login.json()['access_token']}"}

    # 4. Check initial subscriptions for customer -> should be empty list []
    resp = client.get(f"/subscriptions/{customer_id}", headers=customer_headers)
    assert resp.status_code == 200
    assert resp.json() == []

    # 5. Customer updates own subscriptions -> 200 OK
    sample_subs = [
        {
            "name": "Netflix",
            "plan": "Standard",
            "price": 499.0,
            "billing": "Monthly",
            "status": "Active",
            "logo": "https://example.com/logo.svg"
        }
    ]
    resp = client.put(
        f"/subscriptions/{customer_id}",
        json={"subscriptions": json.dumps(sample_subs)},
        headers=customer_headers
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == customer_id
    assert json.loads(resp.json()["subscriptions"]) == sample_subs

    # 6. Customer fetches own updated subscriptions
    resp = client.get(f"/subscriptions/{customer_id}", headers=customer_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Netflix"
    assert resp.json()[0]["price"] == 499.0

    # 7. Customer forbidden check (accessing other customer's subscriptions) -> 403 Forbidden
    resp = client.get(f"/subscriptions/{other_customer_id}", headers=customer_headers)
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"]

    resp = client.put(
        f"/subscriptions/{other_customer_id}",
        json={"subscriptions": json.dumps(sample_subs)},
        headers=customer_headers
    )
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"]

    # 8. Admin updates customer subscriptions -> 200 OK
    admin_sample_subs = [
        {
            "name": "Spotify",
            "plan": "Premium Duo",
            "price": 149.0,
            "billing": "Monthly",
            "status": "Active",
            "logo": "https://example.com/spotify.png"
        }
    ]
    resp = client.put(
        f"/subscriptions/{customer_id}",
        json={"subscriptions": json.dumps(admin_sample_subs)},
        headers=admin_headers
    )
    assert resp.status_code == 200
    assert json.loads(resp.json()["subscriptions"]) == admin_sample_subs

    # 9. Admin fetches customer subscriptions -> 200 OK
    resp = client.get(f"/subscriptions/{customer_id}", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "Spotify"

    # 10. Test invalid user ID -> 404 Not Found
    resp = client.get("/subscriptions/99999", headers=admin_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"

    resp = client.put("/subscriptions/99999", json={"subscriptions": "[]"}, headers=admin_headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"

    # 11. Test invalid body / malformed JSON format -> 400 Bad Request
    resp = client.put(
        f"/subscriptions/{customer_id}",
        json={"subscriptions": "invalid_json_string"},
        headers=customer_headers
    )
    assert resp.status_code == 400
    assert "Invalid subscriptions JSON format" in resp.json()["detail"]
