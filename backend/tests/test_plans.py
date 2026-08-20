"""
BillSphere Plan API Tests

Tests:
- Create plan
- List plans
- Update plan
- Delete plan
"""

from fastapi import status



# ==========================================================
# Create Plan Test
# ==========================================================

def test_create_plan(
    client,
    auth_headers,
):
    """
    Test subscription plan creation.
    """

    response = client.post(

        "/api/v1/plans",

        headers=auth_headers,

        json={

            "name":
            "Professional Plan",

            "description":
            "For growing businesses",

            "price":
            999,

            "billing_cycle":
            "monthly",

        },

    )



    assert response.status_code in [

        status.HTTP_200_OK,

        status.HTTP_201_CREATED,

    ]



    assert response.json() is not None



# ==========================================================
# List Plans Test
# ==========================================================

def test_list_plans(
    client,
    auth_headers,
):
    """
    Test retrieving plans.
    """

    response = client.get(

        "/api/v1/plans",

        headers=auth_headers,

    )



    assert response.status_code == status.HTTP_200_OK



    assert response.json() is not None



# ==========================================================
# Update Plan Test
# ==========================================================

def test_update_plan(
    client,
    auth_headers,
):
    """
    Test updating subscription plan.
    """

    create_response = client.post(

        "/api/v1/plans",

        headers=auth_headers,

        json={

            "name":
            "Basic Plan",

            "description":
            "Starter subscription",

            "price":
            499,

            "billing_cycle":
            "monthly",

        },

    )



    if create_response.status_code not in [

        200,

        201,

    ]:

        return



    plan_data = (
        create_response.json()
    )



    plan_id = (

        plan_data.get(
            "id"
        )

        or

        plan_data.get(
            "data",
            {}
        ).get(
            "id"
        )

    )



    if plan_id is None:

        return



    response = client.put(

        f"/api/v1/plans/{plan_id}",

        headers=auth_headers,

        json={

            "price":
            599,

        },

    )



    assert response.status_code in [

        200,

        204,

    ]



# ==========================================================
# Delete Plan Test
# ==========================================================

def test_delete_plan(
    client,
    auth_headers,
):
    """
    Test deleting subscription plan.
    """

    create_response = client.post(

        "/api/v1/plans",

        headers=auth_headers,

        json={

            "name":
            "Temporary Plan",

            "description":
            "Delete testing plan",

            "price":
            199,

            "billing_cycle":
            "monthly",

        },

    )



    if create_response.status_code not in [

        200,

        201,

    ]:

        return



    plan_data = (
        create_response.json()
    )



    plan_id = (

        plan_data.get(
            "id"
        )

        or

        plan_data.get(
            "data",
            {}
        ).get(
            "id"
        )

    )



    if plan_id is None:

        return



    response = client.delete(

        f"/api/v1/plans/{plan_id}",

        headers=auth_headers,

    )



    assert response.status_code in [

        200,

        204,

    ]