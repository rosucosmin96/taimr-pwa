from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.api.services.model import ServiceCreateRequest, ServiceUpdateRequest
from app.api.services.service import ServiceService
from app.database.factory import DatabaseFactory
from app.models import User


class TestServiceService:
    """Test cases for ServiceService with database operations."""

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
        user = User(id=str(uuid4()), email="test@example.com", name="Test User")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def service_service(self, db_session: Session):
        """Create a ServiceService instance."""
        return ServiceService(db_session)

    async def test_create_service(self, service_service, test_user):
        """Test creating a new service."""
        service_data = ServiceCreateRequest(
            name="Test Service",
            default_duration_minutes=90,
            default_price_per_hour=75.0,
        )

        result = await service_service.create_service(UUID(test_user.id), service_data)

        assert result.user_id == UUID(test_user.id)
        assert result.name == "Test Service"
        assert result.default_duration_minutes == 90
        assert result.default_price_per_hour == 75.0

    async def test_get_services(self, service_service, test_user):
        """Test getting services for a user."""
        # Create test services
        service_data_1 = ServiceCreateRequest(
            name="Service 1", default_duration_minutes=60, default_price_per_hour=100.0
        )

        service_data_2 = ServiceCreateRequest(
            name="Service 2", default_duration_minutes=90, default_price_per_hour=75.0
        )

        await service_service.create_service(UUID(test_user.id), service_data_1)
        await service_service.create_service(UUID(test_user.id), service_data_2)

        # Get all services
        services = await service_service.get_services(UUID(test_user.id))

        assert len(services) == 2
        assert any(s.name == "Service 1" for s in services)
        assert any(s.name == "Service 2" for s in services)

    async def test_update_service(self, service_service, test_user):
        """Test updating a service."""
        # Create a service
        service_data = ServiceCreateRequest(
            name="Original Name",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )

        created_service = await service_service.create_service(
            UUID(test_user.id), service_data
        )

        # Update the service
        update_data = ServiceUpdateRequest(
            name="Updated Name",
            default_duration_minutes=120,
            default_price_per_hour=90.0,
        )

        updated_service = await service_service.update_service(
            UUID(test_user.id), created_service.id, update_data
        )

        assert updated_service.name == "Updated Name"
        assert updated_service.default_duration_minutes == 120
        assert updated_service.default_price_per_hour == 90.0

    async def test_delete_service(self, service_service, test_user):
        """Test deleting a service."""
        # Create a service
        service_data = ServiceCreateRequest(
            name="Test Service",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )

        created_service = await service_service.create_service(
            UUID(test_user.id), service_data
        )

        # Delete the service
        success = await service_service.delete_service(
            UUID(test_user.id), created_service.id
        )

        assert success is True

        # Verify service is deleted
        services = await service_service.get_services(UUID(test_user.id))
        assert len(services) == 0

    async def test_service_not_found(self, service_service, test_user):
        """Test handling of non-existent service."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="Service not found"):
            await service_service.update_service(
                UUID(test_user.id),
                non_existent_id,
                ServiceUpdateRequest(name="Updated"),
            )

    async def test_delete_nonexistent_service(self, service_service, test_user):
        """Test deleting a non-existent service."""
        non_existent_id = uuid4()

        success = await service_service.delete_service(
            UUID(test_user.id), non_existent_id
        )

        assert success is False
