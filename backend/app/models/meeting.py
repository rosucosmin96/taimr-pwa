import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class MeetingStatus(enum.Enum):
    """Enum for meeting status types."""

    UPCOMING = "upcoming"
    DONE = "done"
    CANCELED = "canceled"


class Meeting(Base, TimestampMixin):
    """Meeting model representing scheduled appointments."""

    __tablename__ = "meetings"

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
    title = Column(String(255), nullable=True)
    recurrence_id = Column(
        String(36),
        ForeignKey("recurrences.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    membership_id = Column(
        String(36),
        ForeignKey("memberships.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    price_per_hour = Column(Numeric(10, 2), nullable=False)
    price_total = Column(Numeric(10, 2), nullable=False)
    status = Column(String, nullable=False, default=MeetingStatus.UPCOMING.value)
    paid = Column(Boolean, nullable=False, default=False)

    # Relationships
    user = relationship("User", back_populates="meetings")
    service = relationship("Service", back_populates="meetings")
    client = relationship("Client", back_populates="meetings")
    recurrence = relationship("Recurrence", back_populates="meetings")
    membership = relationship("Membership", back_populates="meetings")

    def __repr__(self):
        return f"<Meeting(id={self.id}, start_time={self.start_time}, status={self.status}, user_id={self.user_id})>"
