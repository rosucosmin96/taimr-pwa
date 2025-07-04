from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user_id
from app.api.recurrences.model import (
    RecurrenceCreateRequest,
    RecurrenceResponse,
    RecurrenceUpdateRequest,
)
from app.api.recurrences.service import RecurrenceService

router = APIRouter()
recurrence_service = RecurrenceService()


@router.post("/", response_model=RecurrenceResponse)
async def create_recurrence(
    recurrence: RecurrenceCreateRequest, user_id: UUID = Depends(get_current_user_id)
):
    """Create a new recurrence and generate future meetings"""
    return await recurrence_service.create_recurrence(user_id, recurrence)


@router.put("/{recurrence_id}", response_model=RecurrenceResponse)
async def update_recurrence(
    recurrence_id: UUID,
    recurrence: RecurrenceUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update a recurrence and apply changes to all future meetings"""
    return await recurrence_service.update_recurrence(
        user_id, recurrence_id, recurrence
    )


@router.delete("/{recurrence_id}")
async def delete_recurrence(
    recurrence_id: UUID, user_id: UUID = Depends(get_current_user_id)
):
    """Delete a recurrence and all associated future meetings"""
    success = await recurrence_service.delete_recurrence(user_id, recurrence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    return {"message": "Recurrence deleted successfully"}
