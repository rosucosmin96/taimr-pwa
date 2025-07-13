import enum
import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class MembershipStatus(enum.Enum):
    """Enum for membership status types."""

    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELED = "canceled"


class Membership(Base, TimestampMixin):
    """Membership model representing client memberships."""

    __tablename__ = "memberships"

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
    name = Column(String(255), nullable=False)
    total_meetings = Column(Integer, nullable=False)
    price_per_membership = Column(Numeric(10, 2), nullable=False)
    price_per_meeting = Column(Numeric(10, 2), nullable=False)
    availability_days = Column(Integer, nullable=False)
    status = Column(String, nullable=False, default=MembershipStatus.ACTIVE.value)
    paid = Column(Boolean, nullable=False, default=False)
    start_date = Column(DateTime(timezone=True), nullable=True, index=True)

    # Relationships
    user = relationship("User", back_populates="memberships")
    service = relationship("Service", back_populates="memberships")
    client = relationship("Client", back_populates="memberships")
    meetings = relationship("Meeting", back_populates="membership")

    def __repr__(self):
        return f"<Membership(id={self.id}, name={self.name}, status={self.status}, user_id={self.user_id})>"
