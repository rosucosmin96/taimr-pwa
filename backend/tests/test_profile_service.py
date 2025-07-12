from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.api.profile.model import ProfileUpdateRequest
from app.api.profile.service import ProfileService
from app.database.factory import DatabaseFactory
from app.models import User


class TestProfileService:
    """Test cases for ProfileService with database operations."""

    @pytest.fixture
    def db_session(self):
        """Create a test database session."""
        db_provider = DatabaseFactory.create_provider(":memory:")
        db_provider.create_tables()
        session = db_provider.get_session()
        yield session
        session.close()

    @pytest.fixture
    def test_user(self, db_session: Session):
        """Create a test user."""
        user = User(
            id=str(uuid4()),
            email="test@example.com",
            name="Test User",
            profile_picture_url="https://example.com/old.jpg",
        )
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def profile_service(self, db_session: Session):
        """Create a ProfileService instance."""
        return ProfileService(db_session)

    async def test_get_profile(self, profile_service, test_user):
        """Test getting user profile."""
        result = await profile_service.get_profile(UUID(test_user.id))

        assert result.id == UUID(test_user.id)
        assert result.email == "test@example.com"
        assert result.name == "Test User"
        assert result.profile_picture_url == "https://example.com/old.jpg"

    async def test_update_profile(self, profile_service, test_user):
        """Test updating user profile."""
        update_data = ProfileUpdateRequest(
            name="Updated Name", profile_picture_url="https://example.com/new.jpg"
        )

        result = await profile_service.update_profile(UUID(test_user.id), update_data)

        assert result.name == "Updated Name"
        assert result.profile_picture_url == "https://example.com/new.jpg"

    async def test_update_profile_partial(self, profile_service, test_user):
        """Test updating only some profile fields."""
        update_data = ProfileUpdateRequest(name="Updated Name")

        result = await profile_service.update_profile(UUID(test_user.id), update_data)

        assert result.name == "Updated Name"
        assert result.profile_picture_url == "https://example.com/old.jpg"  # Unchanged

    async def test_user_not_found(self, profile_service):
        """Test handling of non-existent user."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="User not found"):
            await profile_service.get_profile(non_existent_id)

    async def test_update_nonexistent_user(self, profile_service):
        """Test updating a non-existent user."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="User not found"):
            await profile_service.update_profile(
                non_existent_id, ProfileUpdateRequest(name="Updated")
            )
