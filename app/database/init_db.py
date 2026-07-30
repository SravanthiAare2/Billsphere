from sqlalchemy import text
from app.database.session import Base, engine
from app.models import user  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        # PostgreSQL syntax for adding the column if it doesn't exist
        connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscriptions TEXT;"))
        default_subs = '[]'
        connection.execute(
            text("UPDATE users SET subscriptions = :default_subs WHERE subscriptions IS NULL;"),
            {"default_subs": default_subs}
        )

