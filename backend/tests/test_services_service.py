from uuid import UUID, uuid4

import pytest

from app.api.services.model import ServiceCreateRequest, ServiceUpdateRequest
from app.api.services.service import ServiceService
from app.models import User
from app.storage.factory import StorageFactory


class TestServiceService:
    """Test cases for ServiceService with storage operations."""

    @pytest.fixture
    def service_service(self):
        """Create a ServiceService instance."""
        return ServiceService()

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

    async def test_create_service(self, service_service, test_user_id, setup_test_data):
        """Test creating a new service."""
        service_data = ServiceCreateRequest(
            name="Test Service",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )

        result = await service_service.create_service(test_user_id, service_data)

        assert result.user_id == test_user_id
        assert result.name == "Test Service"
        assert result.default_duration_minutes == 60
        assert result.default_price_per_hour == 100.0

    async def test_get_services(self, service_service, test_user_id, setup_test_data):
        """Test getting services for a user."""
        # Create test services
        service_data_1 = ServiceCreateRequest(
            name="Service 1",
            default_duration_minutes=30,
            default_price_per_hour=50.0,
        )

        service_data_2 = ServiceCreateRequest(
            name="Service 2",
            default_duration_minutes=90,
            default_price_per_hour=150.0,
        )

        await service_service.create_service(test_user_id, service_data_1)
        await service_service.create_service(test_user_id, service_data_2)

        # Get all services
        services = await service_service.get_services(test_user_id)

        assert len(services) == 2
        assert any(s.name == "Service 1" for s in services)
        assert any(s.name == "Service 2" for s in services)

    async def test_update_service(self, service_service, test_user_id, setup_test_data):
        """Test updating a service."""
        # Create a service
        service_data = ServiceCreateRequest(
            name="Original Name",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )

        created_service = await service_service.create_service(
            test_user_id, service_data
        )

        # Update the service
        update_data = ServiceUpdateRequest(
            name="Updated Name",
            default_duration_minutes=90,
            default_price_per_hour=150.0,
        )

        updated_service = await service_service.update_service(
            test_user_id, created_service.id, update_data
        )

        assert updated_service.name == "Updated Name"
        assert updated_service.default_duration_minutes == 90
        assert updated_service.default_price_per_hour == 150.0

    async def test_delete_service(self, service_service, test_user_id, setup_test_data):
        """Test deleting a service."""
        # Create a service
        service_data = ServiceCreateRequest(
            name="Test Service",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )

        created_service = await service_service.create_service(
            test_user_id, service_data
        )

        # Delete the service
        success = await service_service.delete_service(test_user_id, created_service.id)

        assert success is True

        # Verify service is deleted
        services = await service_service.get_services(test_user_id)
        assert len(services) == 0

    async def test_service_not_found(self, service_service, test_user_id):
        """Test handling of non-existent service."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="Service not found"):
            await service_service.update_service(
                test_user_id, non_existent_id, ServiceUpdateRequest(name="Updated")
            )

    async def test_delete_nonexistent_service(self, service_service, test_user_id):
        """Test deleting a non-existent service."""
        non_existent_id = uuid4()

        success = await service_service.delete_service(test_user_id, non_existent_id)

        assert success is False
