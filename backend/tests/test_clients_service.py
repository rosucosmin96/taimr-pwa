from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.api.clients.model import ClientCreateRequest, ClientUpdateRequest
from app.api.clients.service import ClientService
from app.database.factory import DatabaseFactory
from app.models import Service, User


class TestClientService:
    """Test cases for ClientService with database operations."""

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
    def test_service(self, db_session: Session, test_user):
        """Create a test service."""
        service = Service(
            id=str(uuid4()),
            user_id=test_user.id,
            name="Test Service",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )
        db_session.add(service)
        db_session.commit()
        return service

    @pytest.fixture
    def client_service(self, db_session: Session):
        """Create a ClientService instance."""
        return ClientService(db_session)

    async def test_create_client(self, client_service, test_user, test_service):
        """Test creating a new client."""
        client_data = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Test Client",
            email="client@example.com",
            phone="+1-555-0123",
            custom_duration_minutes=90,
            custom_price_per_hour=80.0,
        )

        result = await client_service.create_client(UUID(test_user.id), client_data)

        assert result.user_id == UUID(test_user.id)
        assert result.service_id == UUID(test_service.id)
        assert result.name == "Test Client"
        assert result.email == "client@example.com"
        assert result.phone == "+1-555-0123"
        assert result.custom_duration_minutes == 90
        assert result.custom_price_per_hour == 80.0

    async def test_get_clients(self, client_service, test_user, test_service):
        """Test getting clients for a user."""
        # Create test clients
        client_data_1 = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Client 1",
            email="client1@example.com",
            phone="+1-555-0001",
        )

        client_data_2 = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Client 2",
            email="client2@example.com",
            phone="+1-555-0002",
        )

        await client_service.create_client(UUID(test_user.id), client_data_1)
        await client_service.create_client(UUID(test_user.id), client_data_2)

        # Get all clients
        clients = await client_service.get_clients(UUID(test_user.id))

        assert len(clients) == 2
        assert any(c.name == "Client 1" for c in clients)
        assert any(c.name == "Client 2" for c in clients)

    async def test_get_clients_filtered_by_service(
        self, client_service, test_user, test_service
    ):
        """Test getting clients filtered by service."""
        # Create another service
        service2 = Service(
            id=str(uuid4()),
            user_id=test_user.id,
            name="Service 2",
            default_duration_minutes=30,
            default_price_per_hour=50.0,
        )
        client_service.db.add(service2)
        client_service.db.commit()

        # Create clients for different services
        client_data_1 = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Client Service 1",
            email="client1@example.com",
            phone="+1-555-0001",
        )

        client_data_2 = ClientCreateRequest(
            service_id=UUID(service2.id),
            name="Client Service 2",
            email="client2@example.com",
            phone="+1-555-0002",
        )

        await client_service.create_client(UUID(test_user.id), client_data_1)
        await client_service.create_client(UUID(test_user.id), client_data_2)

        # Get clients for first service only
        clients = await client_service.get_clients(
            UUID(test_user.id), service_id=UUID(test_service.id)
        )

        assert len(clients) == 1
        assert clients[0].name == "Client Service 1"

    async def test_update_client(self, client_service, test_user, test_service):
        """Test updating a client."""
        # Create a client
        client_data = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Original Name",
            email="original@example.com",
            phone="+1-555-0000",
        )

        created_client = await client_service.create_client(
            UUID(test_user.id), client_data
        )

        # Update the client
        update_data = ClientUpdateRequest(
            name="Updated Name",
            email="updated@example.com",
            custom_duration_minutes=120,
            custom_price_per_hour=90.0,
        )

        updated_client = await client_service.update_client(
            UUID(test_user.id), created_client.id, update_data
        )

        assert updated_client.name == "Updated Name"
        assert updated_client.email == "updated@example.com"
        assert updated_client.custom_duration_minutes == 120
        assert updated_client.custom_price_per_hour == 90.0

    async def test_delete_client(self, client_service, test_user, test_service):
        """Test deleting a client."""
        # Create a client
        client_data = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Test Client",
            email="client@example.com",
            phone="+1-555-0000",
        )

        created_client = await client_service.create_client(
            UUID(test_user.id), client_data
        )

        # Delete the client
        success = await client_service.delete_client(
            UUID(test_user.id), created_client.id
        )

        assert success is True

        # Verify client is deleted
        clients = await client_service.get_clients(UUID(test_user.id))
        assert len(clients) == 0

    async def test_client_not_found(self, client_service, test_user):
        """Test handling of non-existent client."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="Client not found"):
            await client_service.update_client(
                UUID(test_user.id), non_existent_id, ClientUpdateRequest(name="Updated")
            )

    async def test_delete_nonexistent_client(self, client_service, test_user):
        """Test deleting a non-existent client."""
        non_existent_id = uuid4()

        success = await client_service.delete_client(
            UUID(test_user.id), non_existent_id
        )

        assert success is False

    async def test_create_client_with_optional_fields(
        self, client_service, test_user, test_service
    ):
        """Test creating a client with optional fields set to None."""
        client_data = ClientCreateRequest(
            service_id=UUID(test_service.id),
            name="Test Client",
            email="client@example.com",
            phone="+1-555-0000",
            custom_duration_minutes=None,
            custom_price_per_hour=None,
        )

        result = await client_service.create_client(UUID(test_user.id), client_data)

        assert result.custom_duration_minutes is None
        assert result.custom_price_per_hour is None
