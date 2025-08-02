from uuid import UUID, uuid4

from app.api.services.model import (
    ServiceCreateRequest,
    ServiceResponse,
    ServiceUpdateRequest,
)
from app.models import Service as ServiceModel
from app.storage.factory import StorageFactory


class ServiceService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=ServiceModel,
            response_class=ServiceResponse,
            table_name="services",
        )

    async def get_services(self, user_id: UUID) -> list[ServiceResponse]:
        """Get all services for a user"""
        return await self.storage.get_all(user_id)

    async def get_service(
        self, user_id: UUID, service_id: UUID
    ) -> ServiceResponse | None:
        """Get a specific service by ID"""
        return await self.storage.get_by_id(user_id, service_id)

    async def create_service(
        self, user_id: UUID, service: ServiceCreateRequest
    ) -> ServiceResponse:
        """Create a new service"""
        service_data = {
            "id": str(uuid4()),
            "name": service.name,
            "default_duration_minutes": service.default_duration_minutes,
            "default_price_per_hour": service.default_price_per_hour,
        }

        return await self.storage.create(user_id, service_data)

    async def update_service(
        self, user_id: UUID, service_id: UUID, service: ServiceUpdateRequest
    ) -> ServiceResponse:
        """Update an existing service"""
        # First check if service exists
        existing_service = await self.storage.get_by_id(user_id, service_id)
        if not existing_service:
            raise ValueError("Service not found")

        # Prepare update data
        update_data = {}
        if service.name is not None:
            update_data["name"] = service.name
        if service.default_duration_minutes is not None:
            update_data["default_duration_minutes"] = service.default_duration_minutes
        if service.default_price_per_hour is not None:
            update_data["default_price_per_hour"] = service.default_price_per_hour

        updated_service = await self.storage.update(user_id, service_id, update_data)
        if not updated_service:
            raise ValueError("Failed to update service")

        return updated_service

    async def delete_service(self, user_id: UUID, service_id: UUID) -> bool:
        """Delete a service"""
        return await self.storage.delete(user_id, service_id)

    async def service_exists(self, user_id: UUID, service_id: UUID) -> bool:
        """Check if a service exists"""
        return await self.storage.exists(user_id, service_id)
