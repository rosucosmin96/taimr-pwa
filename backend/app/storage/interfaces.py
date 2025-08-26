from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar
from uuid import UUID

# Generic type for request/response models
T = TypeVar("T")


# ruff: noqa: UP046
class StorageServiceInterface(ABC, Generic[T]):
    """Abstract interface for storage operations."""

    @abstractmethod
    async def get_all(
        self,
        user_id: UUID,
        filters: dict[str, Any] | None = None,
        order_by: str | None = None,
    ) -> list[T]:
        """Get all records for a user with optional filters and ordering."""
        pass

    @abstractmethod
    async def get_by_id(self, user_id: UUID, record_id: UUID) -> T | None:
        """Get a single record by ID."""
        pass

    @abstractmethod
    async def create(self, user_id: UUID, data: dict[str, Any]) -> T:
        """Create a new record."""
        pass

    @abstractmethod
    async def update(
        self, user_id: UUID, record_id: UUID, data: dict[str, Any]
    ) -> T | None:
        """Update an existing record."""
        pass

    @abstractmethod
    async def delete(self, user_id: UUID, record_id: UUID) -> bool:
        """Delete a record."""
        pass

    @abstractmethod
    async def exists(self, user_id: UUID, record_id: UUID) -> bool:
        """Check if a record exists."""
        pass
