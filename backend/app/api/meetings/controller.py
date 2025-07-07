from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.auth import get_current_user_id
from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingStatus,
    MeetingUpdateRequest,
)
from app.api.meetings.service import MeetingService

router = APIRouter()
meeting_service = MeetingService()


@router.get("/", response_model=list[MeetingResponse])
async def get_meetings(
    status: MeetingStatus | None = Query(None),
    date_filter: date | None = Query(None, alias="date"),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get meetings for the current user, optionally filtered by status and date"""
    return await meeting_service.get_meetings(user_id, status, date_filter)


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    meeting: MeetingCreateRequest, user_id: UUID = Depends(get_current_user_id)
):
    """Create a new meeting"""
    return await meeting_service.create_meeting(user_id, meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: UUID,
    meeting: MeetingUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing meeting"""
    return await meeting_service.update_meeting(user_id, meeting_id, meeting)


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: UUID, user_id: UUID = Depends(get_current_user_id)
):
    """Delete a meeting"""
    success = await meeting_service.delete_meeting(user_id, meeting_id)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}
