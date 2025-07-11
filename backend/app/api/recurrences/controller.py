from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.recurrences.model import (
    RecurrenceCreateRequest,
    RecurrenceResponse,
    RecurrenceUpdateRequest,
)
from app.api.recurrences.service import RecurrenceService
from app.database import get_db

router = APIRouter()


@router.post("/", response_model=RecurrenceResponse)
async def create_recurrence(
    recurrence: RecurrenceCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new recurrence and generate future meetings"""
    service = RecurrenceService(db)
    return await service.create_recurrence(user_id, recurrence)


@router.put("/{recurrence_id}", response_model=RecurrenceResponse)
async def update_recurrence(
    recurrence_id: UUID,
    recurrence: RecurrenceUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update a recurrence and apply changes to all future meetings"""
    service = RecurrenceService(db)
    return await service.update_recurrence(user_id, recurrence_id, recurrence)


@router.delete("/{recurrence_id}")
async def delete_recurrence(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a recurrence and all associated future meetings"""
    service = RecurrenceService(db)
    success = await service.delete_recurrence(user_id, recurrence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    return {"message": "Recurrence deleted successfully"}


@router.get("/{recurrence_id}/meetings")
async def get_recurrence_meetings(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all meetings for a specific recurrence"""
    service = RecurrenceService(db)
    return await service.get_recurrence_meetings(user_id, recurrence_id)
