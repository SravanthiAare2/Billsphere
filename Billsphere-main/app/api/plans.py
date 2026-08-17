from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.database import SessionLocal
from app.models.plan import Plan
from app.schemas.plan import PlanCreate, PlanResponse
from app.core.dependencies import require_role

router = APIRouter(prefix="/plans", tags=["Plans"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=PlanResponse)
def create_plan(plan: PlanCreate, db: Session = Depends(get_db), current_user = Depends(require_role("admin"))):
    new_plan = Plan(**plan.dict())
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan

@router.get("/", response_model=list[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    return db.query(Plan).all()