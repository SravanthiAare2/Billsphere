from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.database.session import get_db
from app.models.user import UserRole
from app.repositories.user import (
    create_user,
    get_user,
    get_user_by_email,
    has_admin_user,
    list_users,
    update_user_role,
    update_user_status,
    delete_user,
)
from app.schemas.auth import (
    Token,
    UserAdminCreate,
    UserCreate,
    UserRead,
    UserRoleUpdate,
    UserStatusUpdate,
)
from app.services.auth import (
    authenticate_user,
    create_access_token_for_user,
    get_current_active_user,
    require_roles,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    return create_user(db, payload, role=UserRole.CUSTOMER)


@router.post("/bootstrap-admin", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def bootstrap_admin(payload: UserCreate, db: Session = Depends(get_db)):
    if has_admin_user(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="An admin user already exists",
        )

    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    return create_user(db, payload, role=UserRole.ADMIN)


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated",
        )

    return create_access_token_for_user(user)


@router.get("/me", response_model=UserRead)
def read_current_user(current_user=Depends(get_current_active_user)):
    return current_user


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_managed_user(
    payload: UserAdminCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    return create_user(db, payload, role=payload.role)


@router.get("/users", response_model=list[UserRead])
def read_users(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    return list_users(db)


@router.patch("/users/{user_id}/role", response_model=UserRead)
def change_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.id == user.id and payload.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own admin role",
        )

    return update_user_role(db, user, payload.role)


@router.patch("/users/{user_id}/status", response_model=UserRead)
def change_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.id == user.id and not payload.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account",
        )

    return update_user_status(db, user, payload.is_active)


@router.get("/admin-check", response_model=dict[str, str])
def admin_check(current_user=Depends(require_roles(UserRole.ADMIN))):
    return {"status": "authorized", "role": current_user.role.value}


@router.put("/profile", response_model=UserRead)
def update_profile(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Allow any authenticated user to update their own full_name and/or password."""
    if "full_name" in payload and payload["full_name"].strip():
        current_user.full_name = payload["full_name"].strip()
    if "password" in payload and payload["password"].strip():
        from app.core.security import get_password_hash
        current_user.hashed_password = get_password_hash(payload["password"])
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/users/{user_id}", response_model=dict[str, str])
def delete_managed_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if current_user.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own admin account",
        )

    delete_user(db, user)
    return {"detail": "User deleted successfully"}


@router.put("/users/{user_id}/subscriptions", response_model=UserRead)
def update_user_subscriptions(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Allow admins to update any customer's plans, and users to update their own."""
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to update subscriptions for this user",
        )
    user = get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if "subscriptions" in payload:
        user.subscriptions = payload["subscriptions"]
        db.commit()
        db.refresh(user)
    return user


