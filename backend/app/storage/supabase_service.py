from datetime import datetime
from typing import Any, TypeVar
from uuid import UUID

from supabase import Client

from .interfaces import StorageServiceInterface

T = TypeVar("T")


class SupabaseService(StorageServiceInterface[T]):
    """Supabase implementation using Supabase SDK."""

    def __init__(
        self, supabase_client: Client, table_name: str, response_class: type[T]
    ):
        self.supabase = supabase_client
        self.table_name = table_name
        self.response_class = response_class

    async def get_all(
        self,
        user_id: UUID,
        filters: dict[str, Any] | None = None,
        order_by: str | None = None,
    ) -> list[T]:
        """Get all records for a user with optional filters and ordering."""
        # Special case for users table - it doesn't have a user_id column
        if self.table_name == "users":
            query = self.supabase.table(self.table_name).select("*")
        else:
            query = (
                self.supabase.table(self.table_name)
                .select("*")
                .eq("user_id", str(user_id))
            )

        if filters:
            for key, value in filters.items():
                if isinstance(value, dict):
                    # Handle range filters like {'gte': datetime, 'lte': datetime}
                    for operator, filter_value in value.items():
                        if operator == "gte":
                            query = query.gte(key, filter_value)
                        elif operator == "lte":
                            query = query.lte(key, filter_value)
                        elif operator == "gt":
                            query = query.gt(key, filter_value)
                        elif operator == "lt":
                            query = query.lt(key, filter_value)
                        elif operator == "neq":
                            query = query.neq(key, filter_value)
                        else:
                            # Fallback to equality for unknown operators
                            query = query.eq(key, filter_value)
                elif isinstance(value, list):
                    # Handle array filters using 'in' operator
                    query = query.in_(key, value)
                else:
                    # Simple equality filter
                    query = query.eq(key, value)

        # Apply ordering if specified
        if order_by:
            # Check if the field exists in the table schema
            # For now, we'll assume created_at exists and order by it
            query = query.order(order_by, desc=False)

        result = query.execute()
        return [self._to_response(record) for record in result.data]

    async def get_by_id(self, user_id: UUID, record_id: UUID) -> T | None:
        """Get a single record by ID."""
        # Special case for users table - it doesn't have a user_id column
        if self.table_name == "users":
            result = (
                self.supabase.table(self.table_name)
                .select("*")
                .eq("id", str(record_id))
                .execute()
            )
        else:
            result = (
                self.supabase.table(self.table_name)
                .select("*")
                .eq("id", str(record_id))
                .eq("user_id", str(user_id))
                .execute()
            )

        if result.data:
            return self._to_response(result.data[0])
        return None

    async def create(self, user_id: UUID, data: dict[str, Any]) -> T:
        """Create a new record."""
        # Special case for users table - it doesn't have a user_id column
        if self.table_name == "users":
            record_data = data
        else:
            record_data = {"user_id": str(user_id), **data}

        # Convert datetime objects to ISO format strings for Supabase
        record_data = self._serialize_datetimes(record_data)

        result = self.supabase.table(self.table_name).insert(record_data).execute()

        if result.data:
            return self._to_response(result.data[0])
        raise ValueError("Failed to create record")

    async def update(
        self, user_id: UUID, record_id: UUID, data: dict[str, Any]
    ) -> T | None:
        """Update an existing record."""
        # First check if record exists and belongs to user
        existing = await self.get_by_id(user_id, record_id)
        if not existing:
            return None

        # Convert datetime objects to ISO format strings for Supabase
        update_data = self._serialize_datetimes(data)

        # Special case for users table - it doesn't have a user_id column
        if self.table_name == "users":
            result = (
                self.supabase.table(self.table_name)
                .update(update_data)
                .eq("id", str(record_id))
                .execute()
            )
        else:
            result = (
                self.supabase.table(self.table_name)
                .update(update_data)
                .eq("id", str(record_id))
                .eq("user_id", str(user_id))
                .execute()
            )

        if result.data:
            return self._to_response(result.data[0])
        return None

    async def delete(self, user_id: UUID, record_id: UUID) -> bool:
        """Delete a record."""
        # Special case for users table - it doesn't have a user_id column
        if self.table_name == "users":
            result = (
                self.supabase.table(self.table_name)
                .delete()
                .eq("id", str(record_id))
                .execute()
            )
        else:
            result = (
                self.supabase.table(self.table_name)
                .delete()
                .eq("id", str(record_id))
                .eq("user_id", str(user_id))
                .execute()
            )
        return len(result.data) > 0

    async def exists(self, user_id: UUID, record_id: UUID) -> bool:
        """Check if a record exists."""
        # Special case for users table - it doesn't have a user_id column
        if self.table_name == "users":
            result = (
                self.supabase.table(self.table_name)
                .select("id")
                .eq("id", str(record_id))
                .execute()
            )
        else:
            result = (
                self.supabase.table(self.table_name)
                .select("id")
                .eq("id", str(record_id))
                .eq("user_id", str(user_id))
                .execute()
            )
        return len(result.data) > 0

    def _to_response(self, record: dict[str, Any]) -> T:
        """Convert Supabase record to response model."""
        if not record:
            return None

        # Convert string IDs to UUIDs
        data = {
            "id": UUID(record["id"]),
        }

        # Handle created_at field - convert to timezone-aware datetime if it's a string
        if "created_at" in record:
            if isinstance(record["created_at"], str):
                try:
                    data["created_at"] = datetime.fromisoformat(
                        record["created_at"].replace("Z", "+00:00")
                    )
                except ValueError:
                    data["created_at"] = record["created_at"]
            else:
                data["created_at"] = record["created_at"]

        # Special case for users table - it doesn't have a user_id column
        if self.table_name != "users":
            data["user_id"] = UUID(record["user_id"])

        # Add other fields
        for key, value in record.items():
            if key not in ["id", "user_id", "created_at"]:
                # Convert datetime strings back to timezone-aware datetime objects
                if isinstance(value, str) and key in [
                    "start_time",
                    "end_time",
                    "start_date",
                    "end_date",
                ]:
                    try:
                        data[key] = datetime.fromisoformat(value.replace("Z", "+00:00"))
                    except ValueError:
                        data[key] = value
                else:
                    data[key] = value

        # If no response class is specified, return the raw data
        if self.response_class is None:
            return data

        return self.response_class(**data)

    def _serialize_datetimes(self, data: dict[str, Any]) -> dict[str, Any]:
        """Convert datetime objects to ISO format strings for Supabase."""
        serialized_data = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                serialized_data[key] = value.isoformat()
            else:
                serialized_data[key] = value
        return serialized_data
