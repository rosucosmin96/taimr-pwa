from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.auth import get_current_user_id
from app.api.profile.model import ProfileResponse, ProfileUpdateRequest
from app.api.profile.service import ProfileService

router = APIRouter()
profile_service = ProfileService()


@router.get("/", response_model=ProfileResponse)
async def get_profile(user_id: UUID = Depends(get_current_user_id)):
    """Get current user profile"""
    return await profile_service.get_profile(user_id)


@router.put("/", response_model=ProfileResponse)
async def update_profile(
    profile: ProfileUpdateRequest, user_id: UUID = Depends(get_current_user_id)
):
    """Update current user profile"""
    return await profile_service.update_profile(user_id, profile)
