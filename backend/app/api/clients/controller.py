from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.clients.model import (
    ClientCreateRequest,
    ClientResponse,
    ClientUpdateRequest,
)
from app.api.clients.service import ClientService
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=list[ClientResponse])
async def get_clients(
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get clients for the current user, optionally filtered by service"""
    service = ClientService(db)
    return await service.get_clients(user_id, service_id)


@router.post("/", response_model=ClientResponse)
async def create_client(
    client: ClientCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new client"""
    service = ClientService(db)
    return await service.create_client(user_id, client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client: ClientUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update an existing client"""
    service = ClientService(db)
    return await service.update_client(user_id, client_id, client)


@router.delete("/{client_id}")
async def delete_client(
    client_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a client"""
    service = ClientService(db)
    success = await service.delete_client(user_id, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}
