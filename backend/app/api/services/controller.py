from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user_id
from app.api.services.model import (
    ServiceCreateRequest,
    ServiceResponse,
    ServiceUpdateRequest,
)
from app.api.services.service import ServiceService

router = APIRouter()
service_service = ServiceService()


@router.get("/", response_model=list[ServiceResponse])
async def get_services(user_id: UUID = Depends(get_current_user_id)):
    """Get all services for the current user"""
    return await service_service.get_services(user_id)


@router.post("/", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreateRequest, user_id: UUID = Depends(get_current_user_id)
):
    """Create a new service"""
    return await service_service.create_service(user_id, service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    service: ServiceUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing service"""
    return await service_service.update_service(user_id, service_id, service)


@router.delete("/{service_id}")
async def delete_service(
    service_id: UUID, user_id: UUID = Depends(get_current_user_id)
):
    """Delete a service"""
    success = await service_service.delete_service(user_id, service_id)
    if not success:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}
