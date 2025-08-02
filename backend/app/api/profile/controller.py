from uuid import UUID

from fastapi import APIRouter, Depends

from app.api.auth import get_current_user_email, get_current_user_id
from app.api.profile.model import ProfileResponse, ProfileUpdateRequest
from app.api.profile.service import ProfileService

router = APIRouter()


@router.get("/", response_model=ProfileResponse)
async def get_profile(
    user_id: UUID = Depends(get_current_user_id),
    user_email: str = Depends(get_current_user_email),
):
    """Get current user profile"""
    service = ProfileService()
    return await service.get_profile(user_id, user_email)


@router.put("/", response_model=ProfileResponse)
async def update_profile(
    profile: ProfileUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    user_email: str = Depends(get_current_user_email),
):
    """Update current user profile"""
    service = ProfileService()
    return await service.update_profile(user_id, profile, user_email)
