from abc import ABC, abstractmethod

from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session


class DatabaseProvider(ABC):
    """Abstract base class for database providers."""

    @abstractmethod
    def get_engine(self) -> Engine:
        """Get the SQLAlchemy engine for this database provider."""
        pass

    @abstractmethod
    def get_session(self) -> Session:
        """Get a database session."""
        pass

    @abstractmethod
    def create_tables(self) -> None:
        """Create all tables in the database."""
        pass

    @abstractmethod
    def drop_tables(self) -> None:
        """Drop all tables in the database."""
        pass

    @abstractmethod
    def get_url(self) -> str:
        """Get the database URL."""
        pass

    @abstractmethod
    def is_connected(self) -> bool:
        """Check if the database is connected."""
        pass
