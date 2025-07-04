from supabase import Client, create_client

from app.config import settings
from app.database.interface import DatabaseInterface


class SupabaseProvider(DatabaseInterface):
    """Supabase database provider."""

    def __init__(self):
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        """Get or create Supabase client."""
        if self._client is None:
            self._client = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
            )
        return self._client

    def get_table(self, table_name: str):
        """Get a table reference."""
        return self.client.table(table_name)

    def get_storage(self):
        """Get storage bucket reference."""
        return self.client.storage

    def execute_query(self, query: str, params: dict | None = None) -> list[dict]:
        """Execute a raw query and return results."""
        # Supabase doesn't support raw SQL queries through the Python client
        # This would need to be implemented via RPC calls if needed
        raise NotImplementedError("Raw SQL queries not supported in Supabase provider")

    def insert(self, table: str, data: dict) -> dict:
        """Insert data into a table."""
        result = self.client.table(table).insert(data).execute()
        return result.data[0] if result.data else {}

    def select(self, table: str, filters: dict | None = None) -> list[dict]:
        """Select data from a table."""
        query = self.client.table(table)
        if filters:
            for key, value in filters.items():
                query = query.eq(key, value)
        result = query.execute()
        return result.data

    def update(self, table: str, data: dict, filters: dict) -> dict:
        """Update data in a table."""
        query = self.client.table(table)
        for key, value in filters.items():
            query = query.eq(key, value)
        result = query.update(data).execute()
        return result.data[0] if result.data else {}

    def delete(self, table: str, filters: dict) -> bool:
        """Delete data from a table."""
        query = self.client.table(table)
        for key, value in filters.items():
            query = query.eq(key, value)
        result = query.delete().execute()
        return len(result.data) > 0
