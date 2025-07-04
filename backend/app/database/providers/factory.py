from app.config import settings
from app.database.interface import DatabaseInterface
from app.database.providers.sqlite import SQLiteProvider
from app.database.providers.supabase import SupabaseProvider


class DatabaseFactory:
    """Factory for creating database providers."""

    @staticmethod
    def create_provider() -> DatabaseInterface:
        """Create the appropriate database provider based on environment."""
        if settings.LOCAL_ENVIRONMENT:
            return SQLiteProvider()
        else:
            return SupabaseProvider()
