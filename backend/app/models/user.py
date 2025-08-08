import uuid

from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class User(Base, TimestampMixin):
    """User model representing the application users."""

    __tablename__ = "users"

    # Use TEXT for SQLite compatibility, UUID for PostgreSQL
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    profile_picture_url = Column(Text, nullable=True)
    tutorial_checked = Column(Boolean, nullable=False, default=False)
    currency = Column(String(3), nullable=False, default="USD")

    # Relationships
    services = relationship(
        "Service", back_populates="user", cascade="all, delete-orphan"
    )
    clients = relationship(
        "Client", back_populates="user", cascade="all, delete-orphan"
    )
    meetings = relationship(
        "Meeting", back_populates="user", cascade="all, delete-orphan"
    )
    recurrences = relationship(
        "Recurrence", back_populates="user", cascade="all, delete-orphan"
    )
    memberships = relationship(
        "Membership", back_populates="user", cascade="all, delete-orphan"
    )
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.name})>"
