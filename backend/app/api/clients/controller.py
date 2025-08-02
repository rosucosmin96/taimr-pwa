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


@router.get("/", response_model=list[ClientResponse])
async def get_clients(
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get clients for the current user, optionally filtered by service"""
    service = ClientService()
    return await service.get_clients(user_id, service_id)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a specific client by ID"""
    service = ClientService()
    client = await service.get_client(user_id, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.post("/", response_model=ClientResponse)
async def create_client(
    client: ClientCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new client"""
    service = ClientService()
    return await service.create_client(user_id, client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    client: ClientUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing client"""
    service = ClientService()
    try:
        return await service.update_client(user_id, client_id, client)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{client_id}")
async def delete_client(
    client_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a client"""
    service = ClientService()
    success = await service.delete_client(user_id, client_id)
    if not success:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted successfully"}
