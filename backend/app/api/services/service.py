from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.services.model import (
    ServiceCreateRequest,
    ServiceResponse,
    ServiceUpdateRequest,
)
from app.models import Service as ServiceModel


class ServiceService:
    def __init__(self, db: Session):
        self.db = db

    async def get_services(self, user_id: UUID) -> list[ServiceResponse]:
        """Get all services for a user"""
        services = (
            self.db.query(ServiceModel)
            .filter(ServiceModel.user_id == str(user_id))
            .all()
        )
        return [self._to_response(service) for service in services]

    async def create_service(
        self, user_id: UUID, service: ServiceCreateRequest
    ) -> ServiceResponse:
        """Create a new service"""
        db_service = ServiceModel(
            id=str(uuid4()),
            user_id=str(user_id),
            name=service.name,
            default_duration_minutes=service.default_duration_minutes,
            default_price_per_hour=service.default_price_per_hour,
        )

        self.db.add(db_service)
        self.db.commit()
        self.db.refresh(db_service)

        return self._to_response(db_service)

    async def update_service(
        self, user_id: UUID, service_id: UUID, service: ServiceUpdateRequest
    ) -> ServiceResponse:
        """Update an existing service"""
        db_service = (
            self.db.query(ServiceModel)
            .filter(
                and_(
                    ServiceModel.id == str(service_id),
                    ServiceModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_service:
            raise ValueError("Service not found")

        if service.name is not None:
            db_service.name = service.name
        if service.default_duration_minutes is not None:
            db_service.default_duration_minutes = service.default_duration_minutes
        if service.default_price_per_hour is not None:
            db_service.default_price_per_hour = service.default_price_per_hour

        self.db.commit()
        self.db.refresh(db_service)

        return self._to_response(db_service)

    async def delete_service(self, user_id: UUID, service_id: UUID) -> bool:
        """Delete a service"""
        db_service = (
            self.db.query(ServiceModel)
            .filter(
                and_(
                    ServiceModel.id == str(service_id),
                    ServiceModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if db_service:
            self.db.delete(db_service)
            self.db.commit()
            return True
        return False

    def _to_response(self, service: ServiceModel) -> ServiceResponse:
        """Convert database model to response model"""
        return ServiceResponse(
            id=UUID(service.id),
            user_id=UUID(service.user_id),
            name=service.name,
            default_duration_minutes=service.default_duration_minutes,
            default_price_per_hour=service.default_price_per_hour,
            created_at=service.created_at,
        )
