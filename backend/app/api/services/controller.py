from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.services.model import (
    ServiceCreateRequest,
    ServiceResponse,
    ServiceUpdateRequest,
)
from app.api.services.service import ServiceService
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=list[ServiceResponse])
async def get_services(
    user_id: UUID = Depends(get_current_user_id), db: Session = Depends(get_db)
):
    """Get all services for the current user"""
    service = ServiceService(db)
    return await service.get_services(user_id)


@router.post("/", response_model=ServiceResponse)
async def create_service(
    service: ServiceCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new service"""
    service_obj = ServiceService(db)
    return await service_obj.create_service(user_id, service)


@router.put("/{service_id}", response_model=ServiceResponse)
async def update_service(
    service_id: UUID,
    service: ServiceUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update an existing service"""
    service_obj = ServiceService(db)
    return await service_obj.update_service(user_id, service_id, service)


@router.delete("/{service_id}")
async def delete_service(
    service_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a service"""
    service_obj = ServiceService(db)
    success = await service_obj.delete_service(user_id, service_id)
    if not success:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted successfully"}
