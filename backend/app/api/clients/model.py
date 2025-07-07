from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class ClientBase(BaseModel):
    service_id: UUID
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=20)
    custom_duration_minutes: int | None = Field(None, ge=15, le=480)
    custom_price_per_hour: float | None = Field(None, ge=0.0)


class ClientCreateRequest(ClientBase):
    pass


class ClientUpdateRequest(BaseModel):
    service_id: UUID | None = None
    name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, min_length=1, max_length=20)
    custom_duration_minutes: int | None = Field(None, ge=15, le=480)
    custom_price_per_hour: float | None = Field(None, ge=0.0)


class ClientResponse(ClientBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
