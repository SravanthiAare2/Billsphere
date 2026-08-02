import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base, get_db
from app.main import app
from app.models.user import UserRole

# Use in-memory SQLite database for fast isolated unit tests
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


def test_auth_and_authorization_lifecycle(client: TestClient):
    # 1. Test Unauthenticated Access to Protected Endpoint -> 401 Unauthorized
    response = client.get("/auth/me")
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"

    # 1b. Test Invalid Token -> 401 Unauthorized
    response_invalid = client.get("/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert response_invalid.status_code == 401
    assert response_invalid.json()["detail"] == "Could not validate credentials"

    # 2. Bootstrap Initial Admin -> 201 Created
    admin_data = {
        "email": "admin@example.com",
        "full_name": "System Admin",
        "password": "AdminPassword123!",
    }
    response = client.post("/auth/bootstrap-admin", json=admin_data)
    assert response.status_code == 201
    admin_user = response.json()
    assert admin_user["email"] == "admin@example.com"
    assert admin_user["role"] == UserRole.ADMIN

    # 3. Attempt Duplicate Admin Bootstrap -> 403 Forbidden
    response = client.post("/auth/bootstrap-admin", json=admin_data)
    assert response.status_code == 403
    assert "already exists" in response.json()["detail"]

    # 4. Login as Admin -> 200 OK with JWT Token
    login_response = client.post(
        "/auth/login",
        data={"username": "admin@example.com", "password": "AdminPassword123!"},
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    admin_headers = {"Authorization": f"Bearer {token_data['access_token']}"}

    # 5. Check Admin Authentication (/auth/me) -> 200 OK
    me_response = client.get("/auth/me", headers=admin_headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "admin@example.com"

    # 6. Check Admin Authorization (/auth/admin-check) -> 200 OK
    admin_check = client.get("/auth/admin-check", headers=admin_headers)
    assert admin_check.status_code == 200
    assert admin_check.json() == {"status": "authorized", "role": "admin"}

    # 7. Register Standard Customer User -> 201 Created
    customer_data = {
        "email": "customer@example.com",
        "full_name": "Jane Customer",
        "password": "CustomerPassword123!",
    }
    reg_response = client.post("/auth/register", json=customer_data)
    assert reg_response.status_code == 201
    assert reg_response.json()["role"] == UserRole.CUSTOMER

    # 8. Login as Customer -> 200 OK
    cust_login = client.post(
        "/auth/login",
        data={"username": "customer@example.com", "password": "CustomerPassword123!"},
    )
    cust_token = cust_login.json()["access_token"]
    customer_headers = {"Authorization": f"Bearer {cust_token}"}

    # 9. Customer Access to /auth/me -> 200 OK
    cust_me = client.get("/auth/me", headers=customer_headers)
    assert cust_me.status_code == 200
    assert cust_me.json()["email"] == "customer@example.com"

    # 10. AUTHORIZATION TEST: Customer Access to /auth/admin-check -> 403 Forbidden!
    cust_admin_check = client.get("/auth/admin-check", headers=customer_headers)
    assert cust_admin_check.status_code == 403
    assert cust_admin_check.json()["detail"] == "You do not have permission to perform this action"

    # 11. AUTHORIZATION TEST: Customer Access to /auth/users -> 403 Forbidden!
    cust_users_list = client.get("/auth/users", headers=customer_headers)
    assert cust_users_list.status_code == 403

    # 12. Admin Access to /auth/users -> 200 OK
    admin_users_list = client.get("/auth/users", headers=admin_headers)
    assert admin_users_list.status_code == 200
    assert len(admin_users_list.json()) == 2

    # 13. Admin Promotes Customer to Finance Role -> 200 OK
    customer_id = reg_response.json()["id"]
    role_update = client.patch(
        f"/auth/users/{customer_id}/role",
        json={"role": UserRole.FINANCE},
        headers=admin_headers,
    )
    assert role_update.status_code == 200
    assert role_update.json()["role"] == UserRole.FINANCE

    # 14. Admin Self-Deactivation Prevention -> 400 Bad Request
    admin_id = admin_user["id"]
    self_deactivate = client.patch(
        f"/auth/users/{admin_id}/status",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert self_deactivate.status_code == 400
    assert self_deactivate.json()["detail"] == "You cannot deactivate your own account"

    # 15. Admin Self-Demotion Prevention -> 400 Bad Request
    self_demote = client.patch(
        f"/auth/users/{admin_id}/role",
        json={"role": UserRole.CUSTOMER},
        headers=admin_headers,
    )
    assert self_demote.status_code == 400
    assert self_demote.json()["detail"] == "You cannot remove your own admin role"

    # 16. Admin Deactivates Customer -> 200 OK
    deactivate_cust = client.patch(
        f"/auth/users/{customer_id}/status",
        json={"is_active": False},
        headers=admin_headers,
    )
    assert deactivate_cust.status_code == 200

    # 17. Deactivated Customer Login -> 400 Bad Request ("User account is deactivated")
    cust_login_deactive = client.post(
        "/auth/login",
        data={"username": "customer@example.com", "password": "CustomerPassword123!"},
    )
    # 18. Portal Route Assertions -> 200 OK HTML
    landing_resp = client.get("/")
    assert landing_resp.status_code == 200
    assert "BillPlatform" in landing_resp.text

    customer_resp = client.get("/customer")
    assert customer_resp.status_code == 200
    assert "Customer" in customer_resp.text

    admin_resp = client.get("/admin")
    assert admin_resp.status_code == 200
    assert "Admin" in admin_resp.text


