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


@router.get("/", response_model=list[ServiceResponse])
async def get_services(user_id: UUID = Depends(get_current_user_id)):
    """Get all services for the current user"""
    service = ServiceService()
    return await service.get_services(user_id)


@router.get("/{service_id}", response_model=ServiceResponse)
async def get_service(
    service_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a specific service by ID"""
    service = ServiceService()
    service_obj = await service.get_service(user_id, service_id)
    if not service_obj:
        raise HTTPException(status_code=404, detail="Service not found")
    return service_obj


@router.post("/", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new service"""
    service_obj = ServiceService()
    return await service_obj.create_service(user_id, service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    service: ServiceUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing service"""
    service_obj = ServiceService()
    try:
        return await service_obj.update_service(user_id, service_id, service)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{service_id}")
async def delete_service(
    service_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a service"""
    service_obj = ServiceService()
    success = await service_obj.delete_service(user_id, service_id)
    if not success:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}
