from .interface import DatabaseInterface
from .providers import DatabaseFactory, SQLiteProvider, SQLiteTable, SupabaseProvider

# Create global database instance
db = DatabaseFactory.create_provider()

__all__ = [
    "DatabaseInterface",
    "SupabaseProvider",
    "SQLiteProvider",
    "SQLiteTable",
    "DatabaseFactory",
    "db",
]
