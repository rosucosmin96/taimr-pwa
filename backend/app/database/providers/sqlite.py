import sqlite3
from typing import Any

from app.database.interface import DatabaseInterface


class SQLiteTable:
    """Simple table interface for SQLite to mimic Supabase table operations."""

    def __init__(self, provider: "SQLiteProvider", table_name: str):
        self.provider = provider
        self.table_name = table_name
        self._filters = {}

    def insert(self, data: dict | list[dict]) -> Any:
        """Insert data into the table."""
        if isinstance(data, list):
            results = []
            for item in data:
                results.append(self.provider.insert(self.table_name, item))
            return type("Result", (), {"data": results})()
        else:
            result = self.provider.insert(self.table_name, data)
            return type("Result", (), {"data": [result]})()

    def select(self, *columns) -> "SQLiteTable":
        """Select columns (not fully implemented for simplicity)."""
        return self

    def eq(self, column: str, value: Any) -> "SQLiteTable":
        """Add equality filter."""
        self._filters[column] = value
        return self

    def execute(self) -> Any:
        """Execute the query."""
        data = self.provider.select(self.table_name, self._filters)
        self._filters = {}  # Reset filters
        return type("Result", (), {"data": data})()

    def update(self, data: dict) -> Any:
        """Update data."""
        if not self._filters:
            raise ValueError("Update requires filters")
        result = self.provider.update(self.table_name, data, self._filters)
        self._filters = {}  # Reset filters
        return type("Result", (), {"data": [result]})()

    def delete(self) -> Any:
        """Delete data."""
        if not self._filters:
            raise ValueError("Delete requires filters")
        success = self.provider.delete(self.table_name, self._filters)
        self._filters = {}  # Reset filters
        return type("Result", (), {"data": [] if success else None})()


class SQLiteProvider(DatabaseInterface):
    """SQLite database provider for local development."""

    def __init__(self, db_path: str = "local_dev.db"):
        self.db_path = db_path
        self._connection = None
        self._init_database()

    @property
    def connection(self):
        """Get or create SQLite connection."""
        if self._connection is None:
            self._connection = sqlite3.connect(self.db_path)
            self._connection.row_factory = sqlite3.Row
        return self._connection

    def _init_database(self):
        """Initialize SQLite database with schema."""
        conn = self.connection
        cursor = conn.cursor()

        # Create tables based on Supabase schema
        cursor.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                profile_picture_url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS services (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                default_duration_minutes INTEGER NOT NULL,
                default_price_per_hour DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            );

            CREATE TABLE IF NOT EXISTS clients (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                service_id TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT,
                phone TEXT,
                custom_duration_minutes INTEGER,
                custom_price_per_hour DECIMAL(10,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (service_id) REFERENCES services (id)
            );

            CREATE TABLE IF NOT EXISTS recurrences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                service_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                frequency TEXT CHECK (frequency IN ('weekly', 'biweekly', 'monthly')) NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (service_id) REFERENCES services (id),
                FOREIGN KEY (client_id) REFERENCES clients (id)
            );

            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                service_id TEXT NOT NULL,
                client_id TEXT NOT NULL,
                recurrence_id TEXT,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP NOT NULL,
                price_per_hour DECIMAL(10,2) NOT NULL,
                price_total DECIMAL(10,2) NOT NULL,
                status TEXT CHECK (status IN ('upcoming', 'done', 'canceled')) DEFAULT 'upcoming',
                paid BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (service_id) REFERENCES services (id),
                FOREIGN KEY (client_id) REFERENCES clients (id),
                FOREIGN KEY (recurrence_id) REFERENCES recurrences (id)
            );
        """
        )
        conn.commit()

    def get_table(self, table_name: str):
        """Get a table reference (SQLite doesn't have table objects like Supabase)."""
        # Return a simple object that mimics Supabase table interface
        return SQLiteTable(self, table_name)

    def get_storage(self):
        """Get storage bucket reference (not supported in SQLite)."""
        raise NotImplementedError("Storage not supported in SQLite provider")

    def execute_query(self, query: str, params: dict | None = None) -> list[dict]:
        """Execute a raw query and return results."""
        cursor = self.connection.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)

        if query.strip().upper().startswith("SELECT"):
            return [dict(row) for row in cursor.fetchall()]
        else:
            self.connection.commit()
            return []

    def insert(self, table: str, data: dict) -> dict:
        """Insert data into a table."""
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["?" for _ in data])
        query = f"INSERT INTO {table} ({columns}) VALUES ({placeholders})"

        cursor = self.connection.cursor()
        cursor.execute(query, list(data.values()))
        self.connection.commit()

        # Return the inserted data with the generated ID
        return data

    def select(self, table: str, filters: dict | None = None) -> list[dict]:
        """Select data from a table."""
        query = f"SELECT * FROM {table}"
        params = []

        if filters:
            conditions = []
            for key, value in filters.items():
                conditions.append(f"{key} = ?")
                params.append(value)
            query += f" WHERE {' AND '.join(conditions)}"

        cursor = self.connection.cursor()
        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def update(self, table: str, data: dict, filters: dict) -> dict:
        """Update data in a table."""
        set_clause = ", ".join([f"{key} = ?" for key in data.keys()])
        where_clause = " AND ".join([f"{key} = ?" for key in filters.keys()])
        query = f"UPDATE {table} SET {set_clause} WHERE {where_clause}"

        params = list(data.values()) + list(filters.values())
        cursor = self.connection.cursor()
        cursor.execute(query, params)
        self.connection.commit()

        # Return the updated data
        return data

    def delete(self, table: str, filters: dict) -> bool:
        """Delete data from a table."""
        where_clause = " AND ".join([f"{key} = ?" for key in filters.keys()])
        query = f"DELETE FROM {table} WHERE {where_clause}"

        cursor = self.connection.cursor()
        cursor.execute(query, list(filters.values()))
        self.connection.commit()

        return cursor.rowcount > 0
