from datetime import datetime, time
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, validator


class RecurrenceFrequency(str, Enum):
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"

    @classmethod
    def from_str(cls, frequency_str: str) -> "RecurrenceFrequency":
        """Get RecurrenceFrequency from a string (case-insensitive). Raises ValueError if not found."""
        for frequency in cls:
            if frequency.value.lower() == frequency_str.lower():
                return frequency
        raise ValueError(f"Invalid RecurrenceFrequency: {frequency_str}")


class RecurrenceBase(BaseModel):
    service_id: UUID
    client_id: UUID
    frequency: RecurrenceFrequency
    start_date: datetime
    end_date: datetime
    # Meeting details for generating instances
    title: str
    start_time: str  # Time string in HH:mm format
    end_time: str  # Time string in HH:mm format
    price_per_hour: float = Field(..., ge=0.0)

    @validator("start_time", "end_time")
    def validate_time_format(cls, v):
        """Validate time format is HH:mm"""
        try:
            time.fromisoformat(v)
            return v
        except ValueError as err:
            raise ValueError("Time must be in HH:mm format") from err

    def get_start_time(self) -> time:
        """Convert string time to time object"""
        return time.fromisoformat(self.start_time)

    def get_end_time(self) -> time:
        """Convert string time to time object"""
        return time.fromisoformat(self.end_time)


class RecurrenceCreateRequest(RecurrenceBase):
    pass


class RecurrenceUpdateRequest(BaseModel):
    service_id: UUID | None = None
    client_id: UUID | None = None
    frequency: RecurrenceFrequency | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    title: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    price_per_hour: float | None = Field(None, ge=0.0)


class RecurrenceResponse(RecurrenceBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class MeetingUpdateRequest(BaseModel):
    service_id: UUID | None = None
    client_id: UUID | None = None
    title: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    price_per_hour: float | None = Field(None, ge=0.0)
    status: str | None = None
    paid: bool | None = None
    update_scope: str | None = None  # Will be validated against RecurrenceUpdateScope


class RecurrenceException(BaseModel):
    """Represents an exception to a recurrence pattern"""

    recurrence_id: UUID
    meeting_id: UUID
    original_start_time: datetime
    modified_start_time: datetime
    modified_end_time: datetime
    modified_title: str | None = None
    modified_price_per_hour: float | None = None
    created_at: datetime
