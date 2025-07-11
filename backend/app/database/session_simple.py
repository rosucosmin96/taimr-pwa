from collections.abc import Generator

from sqlalchemy.orm import Session

from .factory import DatabaseFactory


def get_db_session() -> Session:
    """Get a database session."""
    db_provider = DatabaseFactory.get_current_provider()
    return db_provider.get_session()


def get_db() -> Generator[Session]:
    """FastAPI dependency to get database session."""
    db_provider = DatabaseFactory.get_current_provider()
    db = db_provider.get_session()
    try:
        yield db
    finally:
        db.close()


def get_db_provider():
    """Get database provider."""
    return DatabaseFactory.get_current_provider()
