from datetime import datetime
from uuid import UUID, uuid4

from app.api.clients.model import (
    ClientCreateRequest,
    ClientResponse,
    ClientUpdateRequest,
)


class ClientService:
    def __init__(self):
        # Mock data
        self.mock_clients = [
            ClientResponse(
                id=UUID("44444444-4444-4444-4444-444444444444"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("11111111-1111-1111-1111-111111111111"),
                name="John Smith",
                email="john.smith@email.com",
                phone="+1-555-0123",
                custom_duration_minutes=120,
                custom_price_per_hour=80.0,
                created_at=datetime(2024, 1, 16, 11, 0, 0),
            ),
            ClientResponse(
                id=UUID("55555555-5555-5555-5555-555555555555"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("22222222-2222-2222-2222-222222222222"),
                name="Sarah Johnson",
                email="sarah.j@company.com",
                phone="+1-555-0456",
                custom_duration_minutes=None,
                custom_price_per_hour=None,
                created_at=datetime(2024, 1, 22, 15, 30, 0),
            ),
            ClientResponse(
                id=UUID("66666666-6666-6666-6666-666666666666"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("33333333-3333-3333-3333-333333333333"),
                name="Mike Wilson",
                email="mike.wilson@startup.io",
                phone="+1-555-0789",
                custom_duration_minutes=90,
                custom_price_per_hour=110.0,
                created_at=datetime(2024, 2, 5, 10, 0, 0),
            ),
        ]

    async def get_clients(
        self, user_id: UUID, service_id: UUID | None = None
    ) -> list[ClientResponse]:
        """Get clients for a user, optionally filtered by service"""
        if service_id:
            return [
                client
                for client in self.mock_clients
                if client.service_id == service_id
            ]
        return self.mock_clients

    async def create_client(
        self, user_id: UUID, client: ClientCreateRequest
    ) -> ClientResponse:
        """Create a new client"""
        new_client = ClientResponse(
            id=uuid4(),
            user_id=user_id,
            service_id=client.service_id,
            name=client.name,
            email=client.email,
            phone=client.phone,
            custom_duration_minutes=client.custom_duration_minutes,
            custom_price_per_hour=client.custom_price_per_hour,
            created_at=datetime.now(),
        )
        self.mock_clients.append(new_client)
        return new_client

    async def update_client(
        self, user_id: UUID, client_id: UUID, client: ClientUpdateRequest
    ) -> ClientResponse:
        """Update an existing client"""
        for existing_client in self.mock_clients:
            if existing_client.id == client_id:
                if client.service_id is not None:
                    existing_client.service_id = client.service_id
                if client.name is not None:
                    existing_client.name = client.name
                if client.email is not None:
                    existing_client.email = client.email
                if client.phone is not None:
                    existing_client.phone = client.phone
                if client.custom_duration_minutes is not None:
                    existing_client.custom_duration_minutes = (
                        client.custom_duration_minutes
                    )
                if client.custom_price_per_hour is not None:
                    existing_client.custom_price_per_hour = client.custom_price_per_hour
                return existing_client
        raise ValueError("Client not found")

    async def delete_client(self, user_id: UUID, client_id: UUID) -> bool:
        """Delete a client"""
        for i, client in enumerate(self.mock_clients):
            if client.id == client_id:
                del self.mock_clients[i]
                return True
        return False
