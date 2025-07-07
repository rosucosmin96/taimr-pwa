from datetime import datetime
from uuid import UUID, uuid4

from app.api.services.model import (
    ServiceCreateRequest,
    ServiceResponse,
    ServiceUpdateRequest,
)


class ServiceService:
    def __init__(self):
        # Mock data
        self.mock_services = [
            ServiceResponse(
                id=UUID("11111111-1111-1111-1111-111111111111"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                name="Web Development",
                default_duration_minutes=120,
                default_price_per_hour=75.0,
                created_at=datetime(2024, 1, 15, 10, 0, 0),
            ),
            ServiceResponse(
                id=UUID("22222222-2222-2222-2222-222222222222"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                name="Graphic Design",
                default_duration_minutes=90,
                default_price_per_hour=60.0,
                created_at=datetime(2024, 1, 20, 14, 30, 0),
            ),
            ServiceResponse(
                id=UUID("33333333-3333-3333-3333-333333333333"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                name="Consulting",
                default_duration_minutes=60,
                default_price_per_hour=100.0,
                created_at=datetime(2024, 2, 1, 9, 0, 0),
            ),
        ]

    async def get_services(self, user_id: UUID) -> list[ServiceResponse]:
        """Get all services for a user"""
        return self.mock_services

    async def create_service(
        self, user_id: UUID, service: ServiceCreateRequest
    ) -> ServiceResponse:
        """Create a new service"""
        new_service = ServiceResponse(
            id=uuid4(),
            user_id=user_id,
            name=service.name,
            default_duration_minutes=service.default_duration_minutes,
            default_price_per_hour=service.default_price_per_hour,
            created_at=datetime.now(),
        )
        self.mock_services.append(new_service)
        return new_service

    async def update_service(
        self, user_id: UUID, service_id: UUID, service: ServiceUpdateRequest
    ) -> ServiceResponse:
        """Update an existing service"""
        for _i, existing_service in enumerate(self.mock_services):
            if existing_service.id == service_id:
                if service.name is not None:
                    existing_service.name = service.name
                if service.default_duration_minutes is not None:
                    existing_service.default_duration_minutes = (
                        service.default_duration_minutes
                    )
                if service.default_price_per_hour is not None:
                    existing_service.default_price_per_hour = (
                        service.default_price_per_hour
                    )
                return existing_service
        raise ValueError("Service not found")

    async def delete_service(self, user_id: UUID, service_id: UUID) -> bool:
        """Delete a service"""
        for i, service in enumerate(self.mock_services):
            if service.id == service_id:
                del self.mock_services[i]
                return True
        return False
