"""
BillSphere Authentication Middleware

Middleware responsible for:

- Protecting API requests
- Validating JWT access tokens
- Attaching authenticated user information
- Allowing public authentication and system routes
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.security import decode_access_token


# ==========================================================
# Public Routes
# ==========================================================

PUBLIC_ROUTES = {
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",

    # Authentication routes
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
    "/auth/forgot-password",
    "/auth/reset-password",

    # Health check
    "/health",
}


# ==========================================================
# Authentication Middleware
# ==========================================================

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """
    JWT authentication middleware.

    Public routes are allowed without authentication.

    All other routes require:

        Authorization: Bearer <access_token>
    """

    async def dispatch(
        self,
        request: Request,
        call_next,
    ):
        path = request.url.path

        # --------------------------------------------------
        # Allow public routes
        # --------------------------------------------------

        if path in PUBLIC_ROUTES:
            return await call_next(request)

        # --------------------------------------------------
        # Get Authorization header
        # --------------------------------------------------

        authorization = request.headers.get(
            "Authorization"
        )

        if not authorization:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "message": "Authentication token missing",
                },
                headers={
                    "WWW-Authenticate": "Bearer",
                },
            )

        # --------------------------------------------------
        # Validate Authorization header
        # --------------------------------------------------

        try:
            scheme, token = authorization.split(
                " ",
                1,
            )

            if scheme.lower() != "bearer":
                raise ValueError(
                    "Invalid authentication scheme"
                )

        except ValueError:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "message": "Invalid authorization header",
                },
                headers={
                    "WWW-Authenticate": "Bearer",
                },
            )

        # --------------------------------------------------
        # Decode access token
        # --------------------------------------------------

        try:
            payload = decode_access_token(token)

            if not payload:
                raise ValueError(
                    "Invalid access token"
                )

            request.state.user = payload

        except Exception:
            return JSONResponse(
                status_code=401,
                content={
                    "success": False,
                    "message": "Invalid or expired token",
                },
                headers={
                    "WWW-Authenticate": "Bearer",
                },
            )

        # --------------------------------------------------
        # Continue request
        # --------------------------------------------------

        response = await call_next(request)

        return response