"""
BillSphere Security Module

Handles:
- Password hashing
- Password verification
- JWT access tokens
- JWT refresh tokens
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


# ==========================================================
# Password Hashing Configuration
# ==========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# ==========================================================
# Hash Password
# ==========================================================

def hash_password(password: str) -> str:
    """
    Hash password using bcrypt.

    Bcrypt limitation:
    Maximum 72 bytes.
    """

    if not password:
        raise ValueError("Password cannot be empty")

    password = password[:72]

    return pwd_context.hash(password)



# ==========================================================
# Verify Password
# ==========================================================

def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    """
    Verify password.
    """

    if not plain_password or not hashed_password:
        return False

    plain_password = plain_password[:72]

    try:
        return pwd_context.verify(
            plain_password,
            hashed_password,
        )

    except Exception:
        return False



# ==========================================================
# Create Access Token
# ==========================================================

def create_access_token(
    user_id: int,
) -> str:
    """
    Generate JWT access token.
    """

    expire = (
        datetime.now(timezone.utc)
        +
        timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "type": "access",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )



# ==========================================================
# Create Refresh Token
# ==========================================================

def create_refresh_token(
    user_id: int,
) -> str:
    """
    Generate JWT refresh token.
    """

    expire = (
        datetime.now(timezone.utc)
        +
        timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )



# ==========================================================
# Decode Token
# ==========================================================

def decode_token(
    token: str,
):
    """
    Decode JWT token.
    """

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[
                settings.ALGORITHM
            ],
        )

        

        return payload

    


    except JWTError:

        return None

    # ==========================================================
# Verify Token Type
# ==========================================================

def verify_token_type(
    token: str,
    token_type: str,
) -> bool:
    """
    Check JWT token type.
    """

    payload = decode_token(token)

    if not payload:
        return False

    return payload.get("type") == token_type