from uuid import UUID, uuid4

import pytest

from app.api.profile.model import ProfileUpdateRequest
from app.api.profile.service import ProfileService
from app.models import User
from app.storage.factory import StorageFactory


class TestProfileService:
    """Test cases for ProfileService with storage operations."""

    @pytest.fixture
    def profile_service(self):
        """Create a ProfileService instance."""
        return ProfileService()

    @pytest.fixture
    def test_user_id(self):
        """Create a test user ID."""
        return UUID(uuid4())

    @pytest.fixture
    async def setup_test_data(self, test_user_id):
        """Setup test data using storage."""
        # Create test user
        user_storage = StorageFactory.create_storage_service(
            model_class=User, response_class=None, table_name="users"
        )

        user_data = {
            "id": str(test_user_id),
            "email": "test@example.com",
            "name": "Test User",
            "profile_picture_url": None,
            "tutorial_checked": False,
        }
        await user_storage.create(test_user_id, user_data)

    async def test_get_profile_existing_user(
        self, profile_service, test_user_id, setup_test_data
    ):
        """Test getting profile for an existing user."""
        profile = await profile_service.get_profile(test_user_id, "test@example.com")

        assert profile.id == str(test_user_id)
        assert profile.email == "test@example.com"
        assert profile.name == "Test User"
        assert profile.profile_picture_url is None
        assert profile.tutorial_checked is False

    async def test_get_profile_new_user(self, profile_service, test_user_id):
        """Test getting profile for a new user (should create profile)."""
        profile = await profile_service.get_profile(test_user_id, "newuser@example.com")

        assert profile.id == str(test_user_id)
        assert profile.email == "newuser@example.com"
        assert profile.name == "newuser"  # Extracted from email
        assert profile.profile_picture_url is None
        assert profile.tutorial_checked is False

    async def test_update_profile(self, profile_service, test_user_id, setup_test_data):
        """Test updating a profile."""
        update_data = ProfileUpdateRequest(
            name="Updated Name",
            profile_picture_url="https://example.com/avatar.jpg",
            tutorial_checked=True,
        )

        updated_profile = await profile_service.update_profile(
            test_user_id, update_data, "test@example.com"
        )

        assert updated_profile.name == "Updated Name"
        assert updated_profile.profile_picture_url == "https://example.com/avatar.jpg"
        assert updated_profile.tutorial_checked is True

    async def test_update_profile_partial(
        self, profile_service, test_user_id, setup_test_data
    ):
        """Test updating a profile with partial data."""
        update_data = ProfileUpdateRequest(
            name="Partial Update",
            profile_picture_url=None,
            tutorial_checked=None,
        )

        updated_profile = await profile_service.update_profile(
            test_user_id, update_data, "test@example.com"
        )

        assert updated_profile.name == "Partial Update"
        # Other fields should remain unchanged
        assert updated_profile.profile_picture_url is None
        assert updated_profile.tutorial_checked is False

    async def test_profile_exists(self, profile_service, test_user_id, setup_test_data):
        """Test checking if profile exists."""
        exists = await profile_service.profile_exists(test_user_id)
        assert exists is True

    async def test_profile_not_exists(self, profile_service, test_user_id):
        """Test checking if profile exists for non-existent user."""
        exists = await profile_service.profile_exists(test_user_id)
        assert exists is False
