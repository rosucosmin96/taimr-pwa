from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class RecurrenceFrequency(str, Enum):
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class RecurrenceBase(BaseModel):
    service_id: UUID
    client_id: UUID
    frequency: RecurrenceFrequency
    start_date: datetime
    end_date: datetime


class RecurrenceCreateRequest(RecurrenceBase):
    pass


class RecurrenceUpdateRequest(BaseModel):
    service_id: UUID | None = None
    client_id: UUID | None = None
    frequency: RecurrenceFrequency | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class RecurrenceResponse(RecurrenceBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
