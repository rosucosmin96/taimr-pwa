import enum
import uuid

from sqlalchemy import Column, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class RecurrenceFrequency(enum.Enum):
    """Enum for recurrence frequency types."""

    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"


class Recurrence(Base, TimestampMixin):
    """Recurrence model representing recurring meeting patterns."""

    __tablename__ = "recurrences"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_id = Column(
        String(36),
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    client_id = Column(
        String(36),
        ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    frequency = Column(String, nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)

    # Meeting details for generating instances
    title = Column(String(255), nullable=False)
    start_time = Column(String(5), nullable=False)  # HH:mm format
    end_time = Column(String(5), nullable=False)  # HH:mm format
    price_per_hour = Column(Float, nullable=False, default=0.0)

    # Relationships
    user = relationship("User", back_populates="recurrences")
    service = relationship("Service", back_populates="recurrences")
    client = relationship("Client", back_populates="recurrences")
    meetings = relationship(
        "Meeting", back_populates="recurrence", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Recurrence(id={self.id}, frequency={self.frequency}, user_id={self.user_id})>"
