import os

from .base import DatabaseProvider
from .sqlite_provider import SQLiteProvider


class DatabaseFactory:
    """Factory for creating database providers based on environment."""

    @staticmethod
    def create_provider(database_path: str | None = None) -> DatabaseProvider:
        """
        Create a database provider based on environment variables.

        Args:
            database_path: Optional path for the database file (for SQLite)

        Returns:
            DatabaseProvider: The appropriate database provider
        """
        environment = os.getenv("ENVIRONMENT", "dev").lower()

        if environment == "dev":
            return SQLiteProvider(database_path)
        elif environment == "prod":
            # TODO: Implement PostgreSQL/Supabase provider
            raise NotImplementedError("PostgreSQL provider not yet implemented")
        else:
            # Default to SQLite for unknown environments
            return SQLiteProvider(database_path)

    @staticmethod
    def get_current_provider() -> DatabaseProvider:
        """Get the current database provider based on environment."""
        return DatabaseFactory.create_provider()
