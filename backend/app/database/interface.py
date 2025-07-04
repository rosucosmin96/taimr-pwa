from abc import ABC, abstractmethod


class DatabaseInterface(ABC):
    """Abstract database interface for different providers."""

    @abstractmethod
    def get_table(self, table_name: str):
        """Get a table reference."""
        pass

    @abstractmethod
    def get_storage(self):
        """Get storage bucket reference."""
        pass

    @abstractmethod
    def execute_query(self, query: str, params: dict | None = None) -> list[dict]:
        """Execute a raw query and return results."""
        pass

    @abstractmethod
    def insert(self, table: str, data: dict) -> dict:
        """Insert data into a table."""
        pass

    @abstractmethod
    def select(self, table: str, filters: dict | None = None) -> list[dict]:
        """Select data from a table."""
        pass

    @abstractmethod
    def update(self, table: str, data: dict, filters: dict) -> dict:
        """Update data in a table."""
        pass

    @abstractmethod
    def delete(self, table: str, filters: dict) -> bool:
        """Delete data from a table."""
        pass
