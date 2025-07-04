from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.auth import get_current_user_id
from app.api.clients.model import (
    ClientCreateRequest,
    ClientResponse,
    ClientUpdateRequest,
)
from app.api.clients.service import ClientService

router = APIRouter()
client_service = ClientService()


@router.get("/", response_model=list[ClientResponse])
async def get_clients(
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get clients for the current user, optionally filtered by service"""
    return await client_service.get_clients(user_id, service_id)


@router.post("/", response_model=ClientResponse)
async def create_client(
    client: ClientCreateRequest, user_id: UUID = Depends(get_current_user_id)
):
    """Create a new client"""
    return await client_service.create_client(user_id, client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client: ClientUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing client"""
    return await client_service.update_client(user_id, client_id, client)


@router.delete("/{client_id}")
async def delete_client(client_id: UUID, user_id: UUID = Depends(get_current_user_id)):
    """Delete a client"""
    success = await client_service.delete_client(user_id, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}
