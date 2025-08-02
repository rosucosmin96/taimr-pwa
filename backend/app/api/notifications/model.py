from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class NotificationBase(BaseModel):
    type: str = Field(..., description="Type of notification")
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    related_entity_id: UUID | None = None
    related_entity_type: str | None = None


class NotificationResponse(NotificationBase):
    id: UUID
    user_id: UUID
    read: bool
    read_at: datetime | None
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationUpdateRequest(BaseModel):
    read: bool | None = None


class NotificationMarkReadRequest(BaseModel):
    notification_ids: list[UUID] = Field(..., min_items=1)
