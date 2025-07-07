from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    profile_picture_url: str | None = None


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    profile_picture_url: str | None = None


class ProfileResponse(ProfileBase):
    id: UUID
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
