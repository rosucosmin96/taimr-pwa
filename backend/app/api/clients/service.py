from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.clients.model import (
    ClientCreateRequest,
    ClientResponse,
    ClientUpdateRequest,
)
from app.models import Client as ClientModel


class ClientService:
    def __init__(self, db: Session):
        self.db = db

    async def get_clients(
        self, user_id: UUID, service_id: UUID | None = None
    ) -> list[ClientResponse]:
        """Get clients for a user, optionally filtered by service"""
        query = self.db.query(ClientModel).filter(ClientModel.user_id == str(user_id))

        if service_id:
            query = query.filter(ClientModel.service_id == str(service_id))

        clients = query.all()
        return [self._to_response(client) for client in clients]

    async def create_client(
        self, user_id: UUID, client: ClientCreateRequest
    ) -> ClientResponse:
        """Create a new client"""
        db_client = ClientModel(
            id=str(uuid4()),
            user_id=str(user_id),
            service_id=str(client.service_id),
            name=client.name,
            email=client.email,
            phone=client.phone,
            custom_duration_minutes=client.custom_duration_minutes,
            custom_price_per_hour=client.custom_price_per_hour,
        )

        self.db.add(db_client)
        self.db.commit()
        self.db.refresh(db_client)

        return self._to_response(db_client)

    async def update_client(
        self, user_id: UUID, client_id: UUID, client: ClientUpdateRequest
    ) -> ClientResponse:
        """Update an existing client"""
        db_client = (
            self.db.query(ClientModel)
            .filter(
                and_(
                    ClientModel.id == str(client_id),
                    ClientModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_client:
            raise ValueError("Client not found")

        if client.service_id is not None:
            db_client.service_id = str(client.service_id)
        if client.name is not None:
            db_client.name = client.name
        if client.email is not None:
            db_client.email = client.email
        if client.phone is not None:
            db_client.phone = client.phone
        if client.custom_duration_minutes is not None:
            db_client.custom_duration_minutes = client.custom_duration_minutes
        if client.custom_price_per_hour is not None:
            db_client.custom_price_per_hour = client.custom_price_per_hour

        self.db.commit()
        self.db.refresh(db_client)

        return self._to_response(db_client)

    async def delete_client(self, user_id: UUID, client_id: UUID) -> bool:
        """Delete a client"""
        db_client = (
            self.db.query(ClientModel)
            .filter(
                and_(
                    ClientModel.id == str(client_id),
                    ClientModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if db_client:
            self.db.delete(db_client)
            self.db.commit()
            return True
        return False

    def _to_response(self, client: ClientModel) -> ClientResponse:
        """Convert database model to response model"""
        return ClientResponse(
            id=UUID(client.id),
            user_id=UUID(client.user_id),
            service_id=UUID(client.service_id),
            name=client.name,
            email=client.email,
            phone=client.phone,
            custom_duration_minutes=client.custom_duration_minutes,
            custom_price_per_hour=client.custom_price_per_hour,
            created_at=client.created_at,
        )
