"""
BillSphere database configuration.
"""

from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.DEBUG,
)


SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_database_tables() -> None:
    """Create missing tables for local development."""
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def init_db() -> None:
    """
    Import all models and create missing tables.

    A small compatibility step adds the feature-entitlement column
    for databases created by earlier BillSphere versions. Alembic
    remains the preferred migration mechanism.
    """
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "plans" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("plans")}
        if "feature_entitlements" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE plans ADD COLUMN feature_entitlements JSON")
                )


def check_database_connection() -> bool:
    try:
        with engine.connect():
            return True
    except Exception:
        return False
