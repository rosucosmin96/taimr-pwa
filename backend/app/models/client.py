import uuid

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from .base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    """Client model representing clients of users."""

    __tablename__ = "clients"

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
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(50), nullable=True)
    custom_duration_minutes = Column(Integer, nullable=True)
    custom_price_per_hour = Column(Numeric(10, 2), nullable=True)

    # Relationships
    user = relationship("User", back_populates="clients")
    service = relationship("Service", back_populates="clients")
    meetings = relationship(
        "Meeting", back_populates="client", cascade="all, delete-orphan"
    )
    recurrences = relationship(
        "Recurrence", back_populates="client", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Client(id={self.id}, name={self.name}, user_id={self.user_id}, service_id={self.service_id})>"
