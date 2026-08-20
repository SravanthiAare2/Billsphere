"""
BillSphere Audit Log API Tests

Tests:
- List audit logs
- Filter audit logs by entity
"""

from fastapi import status


def test_list_audit_logs(client, auth_headers):
    """
    Test listing audit logs.
    """

    response = client.get(
        "/api/v1/audit-logs",
        headers=auth_headers,
    )

    assert response.status_code == status.HTTP_200_OK

    body = response.json()
    assert "items" in body
    assert "total" in body


def test_list_audit_logs_filtered_by_entity(client, auth_headers):
    """
    Test filtering audit logs by entity_type/entity_id.
    """

    response = client.get(
        "/api/v1/audit-logs",
        headers=auth_headers,
        params={
            "entity_type": "subscription",
            "entity_id": 1,
        },
    )

    assert response.status_code == status.HTTP_200_OK