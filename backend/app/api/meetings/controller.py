from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.auth import get_current_user_id
from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingUpdateRequest,
)
from app.api.meetings.service import MeetingService

router = APIRouter()


@router.get("/", response_model=list[MeetingResponse])
async def get_meetings(
    status: str | None = Query(None),
    date_filter: date | None = Query(None, alias="date"),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get meetings for the current user, optionally filtered by status (string) and date"""
    service = MeetingService()
    return await service.get_meetings(user_id, status, date_filter)


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    meeting_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a specific meeting by ID"""
    service = MeetingService()
    meeting = await service.get_meeting(user_id, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    meeting: MeetingCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new meeting"""
    service = MeetingService()
    print(meeting.start_time)
    print(meeting.end_time)
    return await service.create_meeting(user_id, meeting)


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    meeting_id: UUID,
    meeting: MeetingUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing meeting with recurrence support"""
    service = MeetingService()
    try:
        return await service.update_meeting(user_id, meeting_id, meeting)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{meeting_id}")
async def delete_meeting(
    meeting_id: UUID,
    delete_scope: str | None = Query(
        None,
        description="Deletion scope for recurring meetings: this_meeting_only, this_and_future, all_meetings",
    ),
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a meeting with optional recurrence scope"""
    service = MeetingService()
    success = await service.delete_meeting(user_id, meeting_id, delete_scope)
    if not success:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting deleted successfully"}


@router.get("/recurrence/{recurrence_id}", response_model=list[MeetingResponse])
async def get_recurring_meetings(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get all meetings for a specific recurrence"""
    service = MeetingService()
    return await service.get_recurring_meetings(user_id, recurrence_id)
