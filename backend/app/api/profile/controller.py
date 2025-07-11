from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.profile.model import ProfileResponse, ProfileUpdateRequest
from app.api.profile.service import ProfileService
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """Get current user profile"""
    service = ProfileService(db)
    return await service.get_profile(user_id)


@router.put("/", response_model=ProfileResponse)
async def update_profile(
    profile: ProfileUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update current user profile"""
    service = ProfileService(db)
    return await service.update_profile(user_id, profile)
