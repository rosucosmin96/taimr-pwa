import uuid

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class Service(Base, TimestampMixin):
    """Service model representing services offered by users."""

    __tablename__ = "services"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(255), nullable=False)
    default_duration_minutes = Column(Integer, nullable=False)
    default_price_per_hour = Column(Numeric(10, 2), nullable=False)

    # Relationships
    user = relationship("User", back_populates="services")
    clients = relationship(
        "Client", back_populates="service", cascade="all, delete-orphan"
    )
    meetings = relationship(
        "Meeting", back_populates="service", cascade="all, delete-orphan"
    )
    recurrences = relationship(
        "Recurrence", back_populates="service", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Service(id={self.id}, name={self.name}, user_id={self.user_id})>"
