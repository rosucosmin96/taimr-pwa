from sqlalchemy import Column, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()


class TimestampMixin:
    """Mixin to add created_at timestamp to models."""

    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
