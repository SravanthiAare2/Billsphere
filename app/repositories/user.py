from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.auth import UserCreate


def get_user(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> User | None:
    statement = select(User).where(User.email == email.lower())
    return db.scalars(statement).first()


def list_users(db: Session) -> list[User]:
    statement = select(User).order_by(User.created_at.desc())
    return list(db.scalars(statement).all())


def has_admin_user(db: Session) -> bool:
    statement = select(User.id).where(User.role == UserRole.ADMIN, User.is_active == True).limit(1)
    return db.scalars(statement).first() is not None


def create_user(db: Session, payload: UserCreate, role: UserRole) -> User:
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_role(db: Session, user: User, role: UserRole) -> User:
    user.role = role
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_status(db: Session, user: User, is_active: bool) -> User:
    user.is_active = is_active
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user: User) -> None:
    db.delete(user)
    db.commit()

