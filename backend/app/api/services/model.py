from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ServiceBase(BaseModel):
    """Base model for a service"""

    name: str = Field(..., min_length=1, max_length=100)
    default_duration_minutes: int = Field(..., ge=15, le=480)  # 15 min to 8 hours
    default_price_per_hour: float = Field(..., ge=0.0)


class ServiceCreateRequest(ServiceBase):
    """Request model for creating a service"""

    pass


class ServiceUpdateRequest(BaseModel):
    """Request model for updating a service"""

    name: str | None = Field(None, min_length=1, max_length=100)
    default_duration_minutes: int | None = Field(None, ge=15, le=480)
    default_price_per_hour: float | None = Field(None, ge=0.0)


class ServiceResponse(ServiceBase):
    """Response model for a service"""

    id: UUID
    user_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
