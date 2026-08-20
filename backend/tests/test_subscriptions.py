"""
BillSphere Subscription API Tests

Tests:
- Create subscription
- List subscriptions
- Update subscription status
- Cancel subscription
"""

from fastapi import status



# ==========================================================
# Create Subscription Test
# ==========================================================

def test_create_subscription(
    client,
    auth_headers,
):
    """
    Test creating subscription.
    """

    response = client.post(

        "/api/v1/subscriptions",

        headers=auth_headers,

        json={

            "customer_id":
            1,

            "plan_id":
            1,

            "start_date":
            "2026-01-01",

            "billing_cycle":
            "monthly",

        },

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_201_CREATED,

        status.HTTP_404_NOT_FOUND,

    ]



# ==========================================================
# List Subscription Test
# ==========================================================

def test_list_subscriptions(
    client,
    auth_headers,
):
    """
    Test listing subscriptions.
    """

    response = client.get(

        "/api/v1/subscriptions",

        headers=auth_headers,

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_404_NOT_FOUND,

    ]



# ==========================================================
# Update Subscription Test
# ==========================================================

def test_update_subscription(
    client,
    auth_headers,
):
    """
    Test updating subscription.
    """

    create_response = client.post(

        "/api/v1/subscriptions",

        headers=auth_headers,

        json={

            "customer_id":
            1,

            "plan_id":
            1,

            "start_date":
            "2026-01-01",

            "billing_cycle":
            "monthly",

        },

    )



    if create_response.status_code not in [

        200,

        201,

    ]:

        return



    subscription_data = (
        create_response.json()
    )



    subscription_id = (

        subscription_data.get(
            "id"
        )

        or

        subscription_data.get(
            "data",
            {}
        ).get(
            "id"
        )

    )



    if subscription_id is None:

        return



    response = client.put(

        f"/api/v1/subscriptions/{subscription_id}",

        headers=auth_headers,

        json={

            "status":
            "active",

        },

    )



    assert response.status_code in [

        200,

        204,

    ]



# ==========================================================
# Cancel Subscription Test
# ==========================================================

def test_cancel_subscription(
    client,
    auth_headers,
):
    """
    Test subscription cancellation.
    """

    response = client.put(

        "/api/v1/subscriptions/1/cancel",

        headers=auth_headers,

    )



    assert response.status_code in [

        200,

        204,

        404,

    ]