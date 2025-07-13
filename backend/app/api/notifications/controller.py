from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.notifications.model import (
    NotificationMarkReadRequest,
    NotificationResponse,
    NotificationUpdateRequest,
)
from app.api.notifications.service import NotificationService
from app.database import get_db

router = APIRouter()


@router.get("/", response_model=list[NotificationResponse])
async def get_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get notifications for the current user"""
    service = NotificationService(db)
    return await service.get_notifications(user_id, unread_only)


@router.put("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: UUID,
    update_data: NotificationUpdateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Update a notification (e.g., mark as read)"""
    service = NotificationService(db)
    try:
        return await service.update_notification(user_id, notification_id, update_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("/mark-read", response_model=list[NotificationResponse])
async def mark_notifications_read(
    request: NotificationMarkReadRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Mark multiple notifications as read"""
    service = NotificationService(db)
    return await service.mark_notifications_read(user_id, request.notification_ids)


@router.post("/check-membership-warnings")
async def check_membership_expiration_warnings(
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Check for membership expiration warnings and create notifications"""
    service = NotificationService(db)
    await service.check_membership_expiration_warnings(user_id)
    return {"message": "Membership expiration warnings checked"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Delete a notification"""
    service = NotificationService(db)
    try:
        await service.delete_notification(user_id, notification_id)
        return {"message": "Notification deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e
