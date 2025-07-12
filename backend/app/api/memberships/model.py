from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class MembershipStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELED = "canceled"

    @classmethod
    def from_str(cls, status_str: str) -> "MembershipStatus":
        """Get MembershipStatus from a string (case-insensitive). Raises ValueError if not found."""
        for status in cls:
            if status.value.lower() == status_str.lower():
                return status
        raise ValueError(f"Invalid MembershipStatus: {status_str}")


class MembershipBase(BaseModel):
    service_id: UUID
    client_id: UUID
    name: str
    total_meetings: int = Field(..., gt=0)
    price_per_membership: float = Field(..., ge=0.0)
    availability_days: int = Field(..., gt=0)


class MembershipCreateRequest(MembershipBase):
    pass


class MembershipUpdateRequest(BaseModel):
    name: str | None = None
    total_meetings: int | None = Field(None, gt=0)
    price_per_membership: float | None = Field(None, ge=0.0)
    availability_days: int | None = Field(None, gt=0)
    status: MembershipStatus | None = None
    paid: bool | None = None


class MembershipResponse(MembershipBase):
    id: UUID
    user_id: UUID
    price_per_meeting: float
    status: MembershipStatus
    paid: bool
    start_date: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True
