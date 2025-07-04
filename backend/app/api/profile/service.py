from datetime import datetime
from uuid import UUID

from app.api.profile.model import ProfileResponse, ProfileUpdateRequest


class ProfileService:
    def __init__(self):
        # Mock data
        self.mock_profile = ProfileResponse(
            id=UUID("00000000-0000-0000-0000-000000000000"),
            email="freelancer@example.com",
            name="Alex Johnson",
            profile_picture_url="https://example.com/profile.jpg",
            created_at=datetime(2024, 1, 1, 12, 0, 0),
        )

    async def get_profile(self, user_id: UUID) -> ProfileResponse:
        """Get user profile"""
        return self.mock_profile

    async def update_profile(
        self, user_id: UUID, profile: ProfileUpdateRequest
    ) -> ProfileResponse:
        """Update user profile"""
        if profile.name is not None:
            self.mock_profile.name = profile.name
        if profile.profile_picture_url is not None:
            self.mock_profile.profile_picture_url = profile.profile_picture_url
        return self.mock_profile
