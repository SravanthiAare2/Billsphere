"""
BillSphere Main Application

FastAPI application entry point.

Responsibilities:
- Create FastAPI instance
- Configure middleware
- Register routers
- Configure startup/shutdown lifecycle
- Initialize logging
- Initialize database
- Health monitoring
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import (
    check_database_connection,
    init_db,
)
from app.core.logging import (
    app_logger,
    setup_logging,
)
from app.core.scheduler import (
    start_scheduler,
    stop_scheduler,
)


# ==========================================================
# Application Lifecycle
# ==========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles application startup and shutdown events.
    """

    # ------------------------------------------------------
    # Startup
    # ------------------------------------------------------

    setup_logging()

    app_logger.info(
        "Starting BillSphere application..."
    )

    app_logger.info(
        f"Environment: {settings.ENVIRONMENT}"
    )

    # ------------------------------------------------------
    # Initialize database
    # ------------------------------------------------------

    try:
        init_db()

        app_logger.info(
            "Database initialized successfully."
        )

    except Exception as exc:
        app_logger.error(
            f"Database initialization failed: {exc}"
        )

    # ------------------------------------------------------
    # Database connection check
    # ------------------------------------------------------

    try:

        if check_database_connection():

            app_logger.info(
                "Database connection successful."
            )

        else:

            app_logger.error(
                "Database connection failed."
            )

    except Exception as exc:

        app_logger.error(
            f"Database health check failed: {exc}"
        )

    # ------------------------------------------------------
    # Start scheduler
    # ------------------------------------------------------

    try:

        start_scheduler()

        app_logger.info(
            "BillSphere scheduler started."
        )

    except Exception as exc:

        app_logger.error(
            f"Scheduler startup failed: {exc}"
        )

    # ------------------------------------------------------
    # Application is ready
    # ------------------------------------------------------

    app_logger.info(
        "BillSphere application is ready."
    )

    yield

    # ------------------------------------------------------
    # Shutdown
    # ------------------------------------------------------

    app_logger.info(
        "Shutting down BillSphere application..."
    )

    try:

        stop_scheduler()

        app_logger.info(
            "BillSphere scheduler stopped."
        )

    except Exception as exc:

        app_logger.error(
            f"Scheduler shutdown failed: {exc}"
        )

    app_logger.info(
        "BillSphere application shutdown complete."
    )


# ==========================================================
# FastAPI Application
# ==========================================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=settings.APP_DESCRIPTION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)


# ==========================================================
# CORS Configuration
# ==========================================================

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]

try:
    configured_origins = settings.get_allowed_origins()

    if configured_origins:
        for origin in configured_origins:
            if origin not in allowed_origins:
                allowed_origins.append(origin)

except Exception as exc:
    app_logger.warning(
        f"Could not load configured CORS origins: {exc}"
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# API Router Registration
# ==========================================================

app.include_router(
    api_router,
    prefix="/api/v1",
)


# ==========================================================
# Root Endpoint
# ==========================================================

@app.get(
    "/",
    tags=["System"],
)
async def root():
    """
    Application root endpoint.
    """

    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


# ==========================================================
# Health Endpoint
# ==========================================================

@app.get(
    "/health",
    tags=["System"],
)
async def health_check():
    """
    Basic application health check.
    """

    try:

        database_status = (
            "connected"
            if check_database_connection()
            else "disconnected"
        )

    except Exception:

        database_status = "disconnected"

    return {
        "status": "healthy",
        "application": settings.APP_NAME,
        "database": database_status,
    }