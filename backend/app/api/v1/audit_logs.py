"""
BillSphere Audit Log API

Endpoints:
- List audit logs (optionally filtered by entity)
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies import database_session, get_current_user_token
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogListResponse


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"],
)


@router.get(
    "",
    response_model=AuditLogListResponse,
)
def list_audit_logs(
    entity_type: str | None = Query(
        default=None,
        description="Filter by entity type, e.g. 'subscription'.",
    ),
    entity_id: int | None = Query(
        default=None,
        description="Filter by entity ID.",
    ),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(database_session),
    current_user: dict = Depends(get_current_user_token),
):
    """
    List audit log entries, most recent first.
    """

    query = db.query(AuditLog)

    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)

    if entity_id is not None:
        query = query.filter(AuditLog.entity_id == entity_id)

    total = query.count()

    items = (
        query
        .order_by(AuditLog.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items,
    }