"""
BillSphere Authentication Tests

Tests:
- User registration
- User login
- JWT authentication
- Protected API access
"""

from fastapi import status



# ==========================================================
# Register User Test
# ==========================================================

def test_register_user(
    client,
):
    """
    Test new user registration.
    """

    response = client.post(

        "/api/v1/auth/register",

        json={

            "name":
            "Test User",

            "email":
            "test@example.com",

            "password":
            "password123",

        },

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_201_CREATED,

    ]



    data = response.json()



    assert (
        data is not None
    )



# ==========================================================
# Login Test
# ==========================================================

def test_login_user(
    client,
):
    """
    Test user login.
    """


    client.post(

        "/api/v1/auth/register",

        json={

            "name":
            "Login User",

            "email":
            "login@example.com",

            "password":
            "password123",

        },

    )



    response = client.post(

        "/api/v1/auth/login",

        json={

            "email":
            "login@example.com",

            "password":
            "password123",

        },

    )



    assert response.status_code == status.HTTP_200_OK



    data = response.json()



    assert (

        "access_token"

        in

        data

        or

        "data"

        in

        data

    )



# ==========================================================
# Protected Route Test
# ==========================================================

def test_protected_endpoint(
    client,
    auth_headers,
):
    """
    Test JWT protected endpoint.
    """


    response = client.get(

        "/api/v1/customers",

        headers=auth_headers,

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_404_NOT_FOUND,

    ]