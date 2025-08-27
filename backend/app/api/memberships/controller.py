from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.api.auth import get_current_user_id
from app.api.memberships.model import (
    MembershipCreateRequest,
    MembershipResponse,
    MembershipUpdateRequest,
)
from app.api.memberships.service import MembershipService

router = APIRouter()


@router.get("/", response_model=list[MembershipResponse])
async def get_memberships(
    user_id: UUID = Depends(get_current_user_id),
):
    """Get all memberships for the current user."""
    service = MembershipService()
    return await service.get_memberships(user_id)


@router.get("/{membership_id}", response_model=MembershipResponse)
async def get_membership(
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get a specific membership by ID."""
    service = MembershipService()
    membership = await service.get_membership(user_id, membership_id)
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    return membership


@router.post("/", response_model=MembershipResponse)
async def create_membership(
    membership: MembershipCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Create a new membership."""
    service = MembershipService()
    try:
        return await service.create_membership(user_id, membership)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{membership_id}", response_model=MembershipResponse)
async def update_membership(
    membership_id: UUID,
    membership: MembershipUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
):
    """Update an existing membership."""
    service = MembershipService()
    try:
        return await service.update_membership(user_id, membership_id, membership)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{membership_id}")
async def delete_membership(
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Delete a membership and all its related meetings."""
    service = MembershipService()
    try:
        await service.delete_membership(user_id, membership_id)
        return {"message": "Membership deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/active/{client_id}", response_model=MembershipResponse | None)
async def get_active_membership(
    client_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get the active membership for a specific client."""
    service = MembershipService()
    return await service.get_active_membership(user_id, client_id)


@router.get("/available/{client_id}", response_model=MembershipResponse | None)
async def get_available_active_membership(
    client_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get the active membership for a specific client only if it has available spots."""
    service = MembershipService()
    return await service.get_available_active_membership(user_id, client_id)


@router.get("/{membership_id}/meetings")
async def get_membership_meetings(
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get all meetings for a specific membership."""
    service = MembershipService()
    try:
        return await service.get_membership_meetings(user_id, membership_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{membership_id}/progress")
async def get_membership_progress(
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
):
    """Get membership progress (completed meetings vs total meetings)."""
    service = MembershipService()
    try:
        return await service.get_membership_progress(user_id, membership_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/{membership_id}/set-start-date")
async def set_membership_start_date(
    membership_id: UUID,
    start_date: datetime,
    user_id: UUID = Depends(get_current_user_id),
):
    """Manually set the start date for a membership."""
    service = MembershipService()
    try:
        await service.set_membership_start_date(membership_id, start_date)
        return {"message": "Membership start date set successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to set membership start date: {str(e)}"
        ) from e
