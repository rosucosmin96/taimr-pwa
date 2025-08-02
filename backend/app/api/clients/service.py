from uuid import UUID, uuid4

from app.api.clients.model import (
    ClientCreateRequest,
    ClientResponse,
    ClientUpdateRequest,
)
from app.models import Client as ClientModel
from app.storage.factory import StorageFactory


class ClientService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=ClientModel, response_class=ClientResponse, table_name="clients"
        )

    async def get_clients(
        self, user_id: UUID, service_id: UUID | None = None
    ) -> list[ClientResponse]:
        """Get clients for a user, optionally filtered by service"""
        filters = {}
        if service_id:
            filters["service_id"] = str(service_id)

        return await self.storage.get_all(user_id, filters)

    async def get_client(self, user_id: UUID, client_id: UUID) -> ClientResponse | None:
        """Get a specific client by ID"""
        return await self.storage.get_by_id(user_id, client_id)

    async def create_client(
        self, user_id: UUID, client: ClientCreateRequest
    ) -> ClientResponse:
        """Create a new client"""
        client_data = {
            "id": str(uuid4()),
            "service_id": str(client.service_id),
            "name": client.name,
            "email": client.email,
            "phone": client.phone,
            "custom_duration_minutes": client.custom_duration_minutes,
            "custom_price_per_hour": client.custom_price_per_hour,
        }

        return await self.storage.create(user_id, client_data)

    async def update_client(
        self, user_id: UUID, client_id: UUID, client: ClientUpdateRequest
    ) -> ClientResponse:
        """Update an existing client"""
        # First check if client exists
        existing_client = await self.storage.get_by_id(user_id, client_id)
        if not existing_client:
            raise ValueError("Client not found")

        # Prepare update data
        update_data = {}
        if client.service_id is not None:
            update_data["service_id"] = str(client.service_id)
        if client.name is not None:
            update_data["name"] = client.name
        if client.email is not None:
            update_data["email"] = client.email
        if client.phone is not None:
            update_data["phone"] = client.phone
        if client.custom_duration_minutes is not None:
            update_data["custom_duration_minutes"] = client.custom_duration_minutes
        if client.custom_price_per_hour is not None:
            update_data["custom_price_per_hour"] = client.custom_price_per_hour

        updated_client = await self.storage.update(user_id, client_id, update_data)
        if not updated_client:
            raise ValueError("Failed to update client")

        return updated_client

    async def delete_client(self, user_id: UUID, client_id: UUID) -> bool:
        """Delete a client"""
        return await self.storage.delete(user_id, client_id)

    async def client_exists(self, user_id: UUID, client_id: UUID) -> bool:
        """Check if a client exists"""
        return await self.storage.exists(user_id, client_id)
