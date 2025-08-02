from uuid import UUID, uuid4

import pytest

from app.api.clients.model import ClientCreateRequest, ClientUpdateRequest
from app.api.clients.service import ClientService
from app.models import Service, User
from app.storage.factory import StorageFactory


class TestClientService:
    """Test cases for ClientService with storage operations."""

    @pytest.fixture
    def client_service(self):
        """Create a ClientService instance."""
        return ClientService()

    @pytest.fixture
    def test_user_id(self):
        """Create a test user ID."""
        return UUID(uuid4())

    @pytest.fixture
    def test_service_id(self):
        """Create a test service ID."""
        return UUID(uuid4())

    @pytest.fixture
    async def setup_test_data(self, test_user_id, test_service_id):
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

        # Create test service
        service_storage = StorageFactory.create_storage_service(
            model_class=Service, response_class=None, table_name="services"
        )

        service_data = {
            "id": str(test_service_id),
            "user_id": str(test_user_id),
            "name": "Test Service",
            "default_duration_minutes": 60,
            "default_price_per_hour": 100.0,
        }
        await service_storage.create(test_user_id, service_data)

    async def test_create_client(
        self, client_service, test_user_id, test_service_id, setup_test_data
    ):
        """Test creating a new client."""
        client_data = ClientCreateRequest(
            service_id=test_service_id,
            name="Test Client",
            email="client@example.com",
            phone="+1-555-0123",
            custom_duration_minutes=90,
            custom_price_per_hour=80.0,
        )

        result = await client_service.create_client(test_user_id, client_data)

        assert result.user_id == test_user_id
        assert result.service_id == test_service_id
        assert result.name == "Test Client"
        assert result.email == "client@example.com"
        assert result.phone == "+1-555-0123"
        assert result.custom_duration_minutes == 90
        assert result.custom_price_per_hour == 80.0

    async def test_get_clients(
        self, client_service, test_user_id, test_service_id, setup_test_data
    ):
        """Test getting clients for a user."""
        # Create test clients
        client_data_1 = ClientCreateRequest(
            service_id=test_service_id,
            name="Client 1",
            email="client1@example.com",
            phone="+1-555-0001",
        )

        client_data_2 = ClientCreateRequest(
            service_id=test_service_id,
            name="Client 2",
            email="client2@example.com",
            phone="+1-555-0002",
        )

        await client_service.create_client(test_user_id, client_data_1)
        await client_service.create_client(test_user_id, client_data_2)

        # Get all clients
        clients = await client_service.get_clients(test_user_id)

        assert len(clients) == 2
        assert any(c.name == "Client 1" for c in clients)
        assert any(c.name == "Client 2" for c in clients)

    async def test_get_clients_filtered_by_service(
        self, client_service, test_user_id, test_service_id, setup_test_data
    ):
        """Test getting clients filtered by service."""
        # Create another service
        service2_id = UUID(uuid4())
        service_storage = StorageFactory.create_storage_service(
            model_class=Service, response_class=None, table_name="services"
        )

        service2_data = {
            "id": str(service2_id),
            "user_id": str(test_user_id),
            "name": "Service 2",
            "default_duration_minutes": 30,
            "default_price_per_hour": 50.0,
        }
        await service_storage.create(test_user_id, service2_data)

        # Create clients for different services
        client_data_1 = ClientCreateRequest(
            service_id=test_service_id,
            name="Client Service 1",
            email="client1@example.com",
            phone="+1-555-0001",
        )

        client_data_2 = ClientCreateRequest(
            service_id=service2_id,
            name="Client Service 2",
            email="client2@example.com",
            phone="+1-555-0002",
        )

        await client_service.create_client(test_user_id, client_data_1)
        await client_service.create_client(test_user_id, client_data_2)

        # Get clients for first service only
        clients = await client_service.get_clients(
            test_user_id, service_id=test_service_id
        )

        assert len(clients) == 1
        assert clients[0].name == "Client Service 1"

    async def test_update_client(
        self, client_service, test_user_id, test_service_id, setup_test_data
    ):
        """Test updating a client."""
        # Create a client
        client_data = ClientCreateRequest(
            service_id=test_service_id,
            name="Original Name",
            email="original@example.com",
            phone="+1-555-0000",
        )

        created_client = await client_service.create_client(test_user_id, client_data)

        # Update the client
        update_data = ClientUpdateRequest(
            name="Updated Name",
            email="updated@example.com",
            custom_duration_minutes=120,
            custom_price_per_hour=90.0,
        )

        updated_client = await client_service.update_client(
            test_user_id, created_client.id, update_data
        )

        assert updated_client.name == "Updated Name"
        assert updated_client.email == "updated@example.com"
        assert updated_client.custom_duration_minutes == 120
        assert updated_client.custom_price_per_hour == 90.0

    async def test_delete_client(
        self, client_service, test_user_id, test_service_id, setup_test_data
    ):
        """Test deleting a client."""
        # Create a client
        client_data = ClientCreateRequest(
            service_id=test_service_id,
            name="Test Client",
            email="client@example.com",
            phone="+1-555-0000",
        )

        created_client = await client_service.create_client(test_user_id, client_data)

        # Delete the client
        success = await client_service.delete_client(test_user_id, created_client.id)

        assert success is True

        # Verify client is deleted
        clients = await client_service.get_clients(test_user_id)
        assert len(clients) == 0

    async def test_client_not_found(self, client_service, test_user_id):
        """Test handling of non-existent client."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="Client not found"):
            await client_service.update_client(
                test_user_id, non_existent_id, ClientUpdateRequest(name="Updated")
            )

    async def test_delete_nonexistent_client(self, client_service, test_user_id):
        """Test deleting a non-existent client."""
        non_existent_id = uuid4()

        success = await client_service.delete_client(test_user_id, non_existent_id)

        assert success is False

    async def test_create_client_with_optional_fields(
        self, client_service, test_user_id, test_service_id, setup_test_data
    ):
        """Test creating a client with optional fields set to None."""
        client_data = ClientCreateRequest(
            service_id=test_service_id,
            name="Test Client",
            email="client@example.com",
            phone="+1-555-0000",
            custom_duration_minutes=None,
            custom_price_per_hour=None,
        )

        result = await client_service.create_client(test_user_id, client_data)

        assert result.custom_duration_minutes is None
        assert result.custom_price_per_hour is None
