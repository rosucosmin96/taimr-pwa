from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user_id
from app.api.commons.shared import RecurrenceUpdateScope
from app.api.recurrences.model import (
    RecurrenceCreateRequest,
    RecurrenceResponse,
    RecurrenceUpdateRequest,
)
from app.api.recurrences.service import RecurrenceService

router = APIRouter()


@router.get("/{recurrence_id}", response_model=RecurrenceResponse)
async def get_recurrence(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a specific recurrence by ID"""
    service = RecurrenceService()
    recurrence = await service.get_recurrence(user_id, recurrence_id)
    if not recurrence:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    return recurrence


@router.post("/", response_model=dict)
async def create_recurrence(
    recurrence: RecurrenceCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new recurrence and generate future meetings, respecting membership limits"""
    service = RecurrenceService()
    result = await service.create_recurrence_with_membership_check(user_id, recurrence)

    # Return detailed response with limitation information
    response = {
        "recurrence": result["recurrence"],
        "meetings_created": result["meetings_created"],
        "membership_used": result["membership_used"],
    }

    if result["limitation_info"]:
        response["limitation_info"] = result["limitation_info"]
        response["message"] = result["limitation_info"]["message"]

    return response


@router.put("/{recurrence_id}", response_model=RecurrenceResponse)
async def update_recurrence(
    recurrence_id: UUID,
    recurrence: RecurrenceUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update a recurrence and apply changes to all future meetings"""
    service = RecurrenceService()
    try:
        return await service.update_recurrence(user_id, recurrence_id, recurrence)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{recurrence_id}")
async def delete_recurrence(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a recurrence and all associated future meetings"""
    service = RecurrenceService()
    success = await service.delete_recurrence(user_id, recurrence_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    return {"message": "Recurrence deleted successfully"}


@router.get("/{recurrence_id}/meetings")
async def get_recurrence_meetings(
    recurrence_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get all meetings for a specific recurrence"""
    service = RecurrenceService()
    return await service.get_recurrence_meetings(user_id, recurrence_id)


@router.put("/meetings/{meeting_id}")
async def update_recurring_meeting(
    meeting_id: UUID,
    update_data: dict,
    update_scope: RecurrenceUpdateScope,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update a recurring meeting based on the specified scope"""
    service = RecurrenceService()
    try:
        # Convert dict to MeetingUpdateRequest and add update_scope
        from app.api.meetings.model import MeetingUpdateRequest

        update_request = MeetingUpdateRequest(**update_data, update_scope=update_scope)

        # Use RecurrenceService to handle the update
        updated_meetings = await service.update_recurring_meeting(
            user_id, meeting_id, update_request
        )

        return updated_meetings
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update recurring meeting: {str(e)}"
        ) from e


@router.delete("/meetings/{meeting_id}")
async def delete_recurring_meeting(
    meeting_id: UUID,
    delete_scope: RecurrenceUpdateScope,
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a recurring meeting based on the specified scope"""
    service = RecurrenceService()
    try:
        # Use RecurrenceService to handle the deletion
        await service.delete_recurring_meeting(user_id, meeting_id, delete_scope)
        return {"message": "Recurring meeting deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete recurring meeting: {str(e)}"
        ) from e


@router.post("/exceptions")
async def create_recurrence_exception(
    recurrence_id: UUID,
    meeting_id: UUID,
    original_start_time: datetime,
    modified_start_time: datetime,
    modified_end_time: datetime,
    modified_title: str | None = None,
    modified_price_per_hour: float | None = None,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create an exception for a specific meeting in a recurrence"""
    service = RecurrenceService()
    try:
        exception = await service.create_recurrence_exception(
            user_id=user_id,
            recurrence_id=recurrence_id,
            meeting_id=meeting_id,
            original_start_time=original_start_time,
            modified_start_time=modified_start_time,
            modified_end_time=modified_end_time,
            modified_title=modified_title,
            modified_price_per_hour=modified_price_per_hour,
        )
        return exception
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create recurrence exception: {str(e)}"
        ) from e
