from datetime import datetime
from typing import Any, TypeVar
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.commons.shared import ensure_utc
from app.models.base import Base

from .interfaces import StorageServiceInterface

T = TypeVar("T")


class SQLiteService(StorageServiceInterface[T]):
    """SQLite implementation using SQLAlchemy ORM."""

    def __init__(self, db: Session, model_class: type[Base], response_class: type[T]):
        self.db = db
        self.model_class = model_class
        self.response_class = response_class

    async def get_all(
        self,
        user_id: UUID,
        filters: dict[str, Any] | None = None,
        order_by: str | None = None,
    ) -> list[T]:
        """Get all records for a user with optional filters and ordering."""
        query = self.db.query(self.model_class).filter(
            self.model_class.user_id == str(user_id)
        )

        if filters:
            for key, value in filters.items():
                if hasattr(self.model_class, key):
                    # Handle complex filters (like datetime ranges)
                    if isinstance(value, dict):
                        query = self._apply_complex_filter(query, key, value)
                    else:
                        # Simple equality filter
                        query = query.filter(getattr(self.model_class, key) == value)

        # Apply ordering if specified
        if order_by:
            if hasattr(self.model_class, order_by):
                field = getattr(self.model_class, order_by)
                query = query.order_by(field)
            else:
                # Default to created_at if specified field doesn't exist
                if hasattr(self.model_class, "created_at"):
                    query = query.order_by(self.model_class.created_at)

        records = query.all()
        return [self._to_response(record) for record in records]

    def _apply_complex_filter(
        self, query, field_name: str, filter_dict: dict[str, Any]
    ):
        """Apply complex filters like datetime ranges."""
        field = getattr(self.model_class, field_name)

        for operator, value in filter_dict.items():
            if operator == "gte":
                # Convert string to datetime if needed
                if isinstance(value, str):
                    value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                query = query.filter(field >= value)
            elif operator == "lte":
                # Convert string to datetime if needed
                if isinstance(value, str):
                    value = datetime.fromisoformat(value.replace("Z", "+00:00"))
                query = query.filter(field <= value)
            elif operator == "in":
                query = query.filter(field.in_(value))
            elif operator == "like":
                query = query.filter(field.like(f"%{value}%"))
            else:
                # Default to equality
                query = query.filter(field == value)

        return query

    async def get_by_id(self, user_id: UUID, record_id: UUID) -> T | None:
        """Get a single record by ID."""
        # Handle User model specifically (User doesn't have user_id field)
        if self.model_class.__name__ == "User":
            record = (
                self.db.query(self.model_class)
                .filter(self.model_class.id == str(record_id))
                .first()
            )
        else:
            # For other models, use the standard user_id filter
            record = (
                self.db.query(self.model_class)
                .filter(
                    and_(
                        self.model_class.id == str(record_id),
                        self.model_class.user_id == str(user_id),
                    )
                )
                .first()
            )

        return self._to_response(record) if record else None

    async def create(self, user_id: UUID, data: dict[str, Any]) -> T:
        """Create a new record."""
        # Handle User model specifically
        if self.model_class.__name__ == "User":
            record = self.model_class(**data)
        else:
            record = self.model_class(user_id=str(user_id), **data)

        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)

        return self._to_response(record)

    async def update(
        self, user_id: UUID, record_id: UUID, data: dict[str, Any]
    ) -> T | None:
        """Update an existing record."""
        # Handle User model specifically
        if self.model_class.__name__ == "User":
            record = (
                self.db.query(self.model_class)
                .filter(self.model_class.id == str(record_id))
                .first()
            )
        else:
            record = (
                self.db.query(self.model_class)
                .filter(
                    and_(
                        self.model_class.id == str(record_id),
                        self.model_class.user_id == str(user_id),
                    )
                )
                .first()
            )

        if not record:
            return None

        for key, value in data.items():
            if hasattr(record, key) and value is not None:
                setattr(record, key, value)

        self.db.commit()
        self.db.refresh(record)

        return self._to_response(record)

    async def delete(self, user_id: UUID, record_id: UUID) -> bool:
        """Delete a record."""
        # Handle User model specifically
        if self.model_class.__name__ == "User":
            record = (
                self.db.query(self.model_class)
                .filter(self.model_class.id == str(record_id))
                .first()
            )
        else:
            record = (
                self.db.query(self.model_class)
                .filter(
                    and_(
                        self.model_class.id == str(record_id),
                        self.model_class.user_id == str(user_id),
                    )
                )
                .first()
            )

        if record:
            self.db.delete(record)
            self.db.commit()
            return True
        return False

    async def exists(self, user_id: UUID, record_id: UUID) -> bool:
        """Check if a record exists."""
        # Handle User model specifically
        if self.model_class.__name__ == "User":
            return (
                self.db.query(self.model_class)
                .filter(self.model_class.id == str(record_id))
                .first()
                is not None
            )
        else:
            return (
                self.db.query(self.model_class)
                .filter(
                    and_(
                        self.model_class.id == str(record_id),
                        self.model_class.user_id == str(user_id),
                    )
                )
                .first()
                is not None
            )

    def _to_response(self, record: Base) -> T:
        """Convert database model to response model."""
        if not record:
            return None

        # Convert SQLAlchemy model to dict
        data = {"id": UUID(record.id), "created_at": ensure_utc(record.created_at)}

        # Add user_id for non-User models
        if hasattr(record, "user_id"):
            data["user_id"] = UUID(record.user_id)

        # Add model-specific fields
        for column in record.__table__.columns:
            if column.name not in ["id", "user_id", "created_at"]:
                value = getattr(record, column.name)
                if (
                    hasattr(column.type, "python_type")
                    and column.type.python_type is bool
                ):
                    data[column.name] = bool(value) if value is not None else None
                else:
                    data[column.name] = value

        # If response_class is None, return the data dict directly
        if self.response_class is None:
            return data

        return self.response_class(**data)
