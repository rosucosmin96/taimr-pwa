from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingUpdateRequest,
)
from app.api.meetings.service import MeetingService
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=list[MeetingResponse])
async def get_meetings(
    status: str | None = Query(None),
    date_filter: date | None = Query(None, alias="date"),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get meetings for the current user, optionally filtered by status (string) and date"""
    service = MeetingService(db)
    return await service.get_meetings(user_id, status, date_filter)


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    meeting: MeetingCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new meeting"""
    service = MeetingService(db)
    return await service.create_meeting(user_id, meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: UUID,
    meeting: MeetingUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update an existing meeting with recurrence support"""
    service = MeetingService(db)
    return await service.update_meeting(user_id, meeting_id, meeting)


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a meeting"""
    service = MeetingService(db)
    success = await service.delete_meeting(user_id, meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}


@router.get("/recurrence/{recurrence_id}", response_model=list[MeetingResponse])
async def get_recurring_meetings(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all meetings for a specific recurrence"""
    service = MeetingService(db)
    return await service.get_recurring_meetings(user_id, recurrence_id)
