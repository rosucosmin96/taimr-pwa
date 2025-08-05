from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field

from app.api.commons.shared import RecurrenceUpdateScope


class MeetingStatus(str, Enum):
    UPCOMING = "upcoming"
    DONE = "done"
    CANCELED = "canceled"

    @classmethod
    def from_str(cls, status_str: str) -> "MeetingStatus":
        """Get MeetingStatus from a string (case-insensitive). Raises ValueError if not found."""
        for status in cls:
            if status.value.lower() == status_str.lower():
                return status
        raise ValueError(f"Invalid MeetingStatus: {status_str}")


class MeetingBase(BaseModel):
    service_id: UUID
    client_id: UUID
    title: str | None = None
    recurrence_id: UUID | None = None
    membership_id: UUID | None = None
    start_time: datetime
    end_time: datetime
    price_per_hour: float = Field(..., ge=0.0)
    status: MeetingStatus = MeetingStatus.UPCOMING
    paid: bool = False


class MeetingCreateRequest(MeetingBase):
    pass


class MeetingUpdateRequest(BaseModel):
    service_id: UUID | None = None
    client_id: UUID | None = None
    title: str | None = None
    recurrence_id: UUID | None = None
    membership_id: UUID | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    price_per_hour: float | None = Field(None, ge=0.0)
    status: MeetingStatus | None = None
    paid: bool | None = None
    update_scope: RecurrenceUpdateScope | None = None


class MeetingResponse(MeetingBase):
    id: UUID
    user_id: UUID
    price_total: float
    created_at: datetime
    start_time: datetime
    end_time: datetime
    title: str | None = None
    status: str
    paid: bool
    price_per_hour: float

    class Config:
        from_attributes = True
