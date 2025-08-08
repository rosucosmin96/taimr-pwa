from datetime import datetime
from uuid import UUID

from app.api.commons.shared import Currency
from app.api.profile.model import ProfileResponse, ProfileUpdateRequest
from app.models import User as UserModel
from app.storage.factory import StorageFactory


class ProfileService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=UserModel, response_class=ProfileResponse, table_name="users"
        )

    async def get_profile(
        self, user_id: UUID, user_email: str = None
    ) -> ProfileResponse:
        """Get user profile, create if doesn't exist"""
        user = await self.storage.get_by_id(user_id, user_id)

        if not user:
            # Get user info from auth context
            try:
                # Use the actual user email from auth context
                email = user_email or "user@example.com"
                name = email.split("@")[0] if email != "user@example.com" else "User"

                user_data = {
                    "id": str(user_id),
                    "email": email,
                    "name": name,
                    "profile_picture_url": None,
                    "tutorial_checked": False,
                    "currency": Currency.USD,
                }
                user = await self.storage.create(user_id, user_data)
            except Exception:
                # If we can't create the user, return a default response
                return ProfileResponse(
                    id=str(user_id),
                    email=user_email or "user@example.com",
                    name=user_email.split("@")[0] if user_email else "User",
                    profile_picture_url=None,
                    tutorial_checked=False,
                    currency=Currency.USD,
                    created_at=datetime.utcnow(),
                )

        return user

    async def update_profile(
        self, user_id: UUID, profile: ProfileUpdateRequest, user_email: str = None
    ) -> ProfileResponse:
        """Update user profile, create if doesn't exist"""
        user = await self.storage.get_by_id(user_id, user_id)

        if not user:
            # Create a new user with the provided data
            user_data = {
                "id": str(user_id),
                "email": user_email or "user@example.com",
                "name": profile.name or "User",
                "profile_picture_url": profile.profile_picture_url,
                "tutorial_checked": (
                    profile.tutorial_checked
                    if profile.tutorial_checked is not None
                    else False
                ),
                "currency": (
                    profile.currency.value if profile.currency else Currency.USD
                ),
            }
            user = await self.storage.create(user_id, user_data)
        else:
            # Update existing user
            update_fields = {}

            if profile.name is not None:
                update_fields["name"] = profile.name
            if profile.profile_picture_url is not None:
                update_fields["profile_picture_url"] = profile.profile_picture_url
            if profile.tutorial_checked is not None:
                update_fields["tutorial_checked"] = profile.tutorial_checked
            if profile.currency is not None:
                update_fields["currency"] = profile.currency.value
            if user_email:
                update_fields["email"] = user_email

            if update_fields:
                user = await self.storage.update(user_id, user_id, update_fields)
                if not user:
                    raise ValueError("Failed to update profile")

        return user

    async def create_user_profile(
        self, user_id: UUID, email: str, name: str = None
    ) -> ProfileResponse:
        """Create a new user profile during sign-up"""
        user_data = {
            "id": str(user_id),
            "email": email,
            "name": name or "User",
            "profile_picture_url": None,
            "tutorial_checked": False,
            "currency": Currency.USD,
        }
        return await self.storage.create(user_id, user_data)

    async def profile_exists(self, user_id: UUID) -> bool:
        """Check if a user profile exists"""
        return await self.storage.exists(user_id, user_id)
