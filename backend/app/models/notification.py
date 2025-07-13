import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class NotificationType(enum.Enum):
    """Enum for notification types."""

    MEMBERSHIP_EXPIRING = "membership_expiring"
    MEMBERSHIP_EXPIRED = "membership_expired"
    MEETING_REMINDER = "meeting_reminder"
    PAYMENT_DUE = "payment_due"


class Notification(Base, TimestampMixin):
    """Notification model representing user notifications."""

    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    related_entity_id = Column(String(36), nullable=True, index=True)
    related_entity_type = Column(
        String(50), nullable=True
    )  # e.g., "membership", "meeting"
    read = Column(Boolean, nullable=False, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id}, read={self.read})>"
