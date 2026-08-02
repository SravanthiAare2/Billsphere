from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import SQLAlchemyError

from app.api.auth import router as auth_router
from app.api.subscriptions import router as subscriptions_router
from app.config.settings import settings
from app.database.init_db import init_db
from app.database.session import ping_database

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# Enable CORS for local development & API consumption
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Auth API router first so API routes take precedence
app.include_router(auth_router)
app.include_router(subscriptions_router)


@app.get("/customer")
def customer_portal() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "customer.html")


@app.get("/admin")
def admin_portal() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "admin.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db")
def database_health() -> dict[str, str]:
    try:
        ping_database()
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=503,
            detail="Database connection failed",
        ) from exc

    return {"database": "connected"}


# Mount static assets for css, js, and html at root /
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
