from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.memberships.model import (
    MembershipCreateRequest,
    MembershipResponse,
    MembershipUpdateRequest,
)
from app.api.memberships.service import MembershipService
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=list[MembershipResponse])
async def get_memberships(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all memberships for the current user."""
    service = MembershipService(db)
    return await service.get_memberships(user_id)


@router.post("/", response_model=MembershipResponse)
async def create_membership(
    membership: MembershipCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Create a new membership."""
    service = MembershipService(db)
    try:
        return await service.create_membership(user_id, membership)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.put("/{membership_id}", response_model=MembershipResponse)
async def update_membership(
    membership_id: UUID,
    membership: MembershipUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update an existing membership."""
    service = MembershipService(db)
    try:
        return await service.update_membership(user_id, membership_id, membership)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{membership_id}")
async def delete_membership(
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete (cancel) a membership."""
    service = MembershipService(db)
    try:
        await service.delete_membership(user_id, membership_id)
        return {"message": "Membership deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/active/{client_id}", response_model=MembershipResponse | None)
async def get_active_membership(
    client_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get the active membership for a specific client."""
    service = MembershipService(db)
    return await service.get_active_membership(user_id, client_id)


@router.get("/{membership_id}/meetings")
async def get_membership_meetings(
    membership_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get all meetings for a specific membership."""
    service = MembershipService(db)
    try:
        return await service.get_membership_meetings(user_id, membership_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
