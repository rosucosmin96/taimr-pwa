from uuid import UUID

from sqlalchemy.orm import Session

from app.api.profile.model import ProfileResponse, ProfileUpdateRequest
from app.models import User as UserModel


class ProfileService:
    def __init__(self, db: Session):
        self.db = db

    async def get_profile(self, user_id: UUID) -> ProfileResponse:
        """Get user profile, create if doesn't exist"""
        user = self.db.query(UserModel).filter(UserModel.id == str(user_id)).first()

        if not user:
            # Create a default user if they don't exist
            user = UserModel(
                id=str(user_id),
                email="user@example.com",  # Default email
                name="User",  # Default name
                profile_picture_url=None,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        return self._to_response(user)

    async def update_profile(
        self, user_id: UUID, profile: ProfileUpdateRequest
    ) -> ProfileResponse:
        """Update user profile, create if doesn't exist"""
        user = self.db.query(UserModel).filter(UserModel.id == str(user_id)).first()

        if not user:
            # Create a default user if they don't exist
            user = UserModel(
                id=str(user_id),
                email="user@example.com",  # Default email
                name="User",  # Default name
                profile_picture_url=None,
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        if profile.name is not None:
            user.name = profile.name
        if profile.profile_picture_url is not None:
            user.profile_picture_url = profile.profile_picture_url

        self.db.commit()
        self.db.refresh(user)

        return self._to_response(user)

    def _to_response(self, user: UserModel) -> ProfileResponse:
        """Convert database model to response model"""
        return ProfileResponse(
            id=UUID(user.id),
            email=user.email,
            name=user.name,
            profile_picture_url=user.profile_picture_url,
            created_at=user.created_at,
        )
