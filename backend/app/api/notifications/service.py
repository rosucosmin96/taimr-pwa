from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.commons.shared import ensure_utc
from app.api.notifications.model import (
    NotificationResponse,
    NotificationUpdateRequest,
)
from app.models import (
    Meeting as MeetingModel,
)
from app.models import (
    Membership as MembershipModel,
)
from app.models import (
    Notification as NotificationModel,
)
from app.models.notification import NotificationType


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    async def get_notifications(
        self, user_id: UUID, unread_only: bool = False
    ) -> list[NotificationResponse]:
        """Get notifications for a user, optionally filtered to unread only"""
        query = self.db.query(NotificationModel).filter(
            NotificationModel.user_id == str(user_id)
        )

        if unread_only:
            query = query.filter(not NotificationModel.read)

        notifications = query.order_by(NotificationModel.created_at.desc()).all()
        return [self._to_response(notification) for notification in notifications]

    async def create_notification(
        self,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        related_entity_id: UUID | None = None,
        related_entity_type: str | None = None,
    ) -> NotificationResponse:
        """Create a new notification"""

        # Check if notification already exists
        existing_notification = (
            self.db.query(NotificationModel)
            .filter(
                and_(
                    NotificationModel.user_id == str(user_id),
                    NotificationModel.related_entity_id == str(related_entity_id),
                    NotificationModel.related_entity_type == related_entity_type,
                )
            )
            .first()
        )

        if existing_notification:
            return self._to_response(existing_notification)

        db_notification = NotificationModel(
            id=str(uuid4()),
            user_id=str(user_id),
            type=notification_type,
            title=title,
            message=message,
            related_entity_id=str(related_entity_id) if related_entity_id else None,
            related_entity_type=related_entity_type,
            read=False,
        )

        self.db.add(db_notification)
        self.db.commit()
        self.db.refresh(db_notification)

        return self._to_response(db_notification)

    async def update_notification(
        self,
        user_id: UUID,
        notification_id: UUID,
        update_data: NotificationUpdateRequest,
    ) -> NotificationResponse:
        """Update a notification"""
        db_notification = (
            self.db.query(NotificationModel)
            .filter(
                and_(
                    NotificationModel.id == str(notification_id),
                    NotificationModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_notification:
            raise ValueError("Notification not found")

        if update_data.read is not None:
            db_notification.read = update_data.read
            if update_data.read:
                db_notification.read_at = ensure_utc(datetime.now())
            else:
                db_notification.read_at = None

        self.db.commit()
        self.db.refresh(db_notification)

        return self._to_response(db_notification)

    async def mark_notifications_read(
        self, user_id: UUID, notification_ids: list[UUID]
    ) -> list[NotificationResponse]:
        """Mark multiple notifications as read"""
        notifications = (
            self.db.query(NotificationModel)
            .filter(
                and_(
                    NotificationModel.user_id == str(user_id),
                    NotificationModel.id.in_([str(nid) for nid in notification_ids]),
                )
            )
            .all()
        )

        updated_notifications = []
        for notification in notifications:
            notification.read = True
            notification.read_at = ensure_utc(datetime.now())
            updated_notifications.append(notification)

        self.db.commit()

        return [
            self._to_response(notification) for notification in updated_notifications
        ]

    async def delete_notification(self, user_id: UUID, notification_id: UUID) -> None:
        """Delete a notification"""
        db_notification = (
            self.db.query(NotificationModel)
            .filter(
                and_(
                    NotificationModel.id == str(notification_id),
                    NotificationModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_notification:
            raise ValueError("Notification not found")

        self.db.delete(db_notification)
        self.db.commit()

    async def check_membership_expiration_warnings(self, user_id: UUID) -> None:
        """Check for membership expiration warnings and create notifications"""
        # Get active memberships
        active_memberships = (
            self.db.query(MembershipModel)
            .filter(
                and_(
                    MembershipModel.user_id == str(user_id),
                    MembershipModel.status == "active",
                )
            )
            .all()
        )

        for membership in active_memberships:
            await self._check_single_membership_expiration(membership)

    async def _check_single_membership_expiration(
        self, membership: MembershipModel
    ) -> None:
        """Check if a single membership is about to expire and create notification if needed"""
        # Check if we already have a recent notification for this membership
        recent_notification = (
            self.db.query(NotificationModel)
            .filter(
                and_(
                    NotificationModel.user_id == membership.user_id,
                    NotificationModel.type
                    == NotificationType.MEMBERSHIP_EXPIRING.value,
                    NotificationModel.related_entity_id == membership.id,
                    NotificationModel.created_at >= datetime.now() - timedelta(days=1),
                )
            )
            .first()
        )

        if recent_notification:
            return  # Already notified recently

        should_notify = False
        days_until_expiry = None

        # Check time-based expiration
        if membership.start_date:
            expiration_date = membership.start_date + timedelta(
                days=membership.availability_days
            )
            days_until_expiry = (expiration_date - datetime.now()).days

            if 0 <= days_until_expiry <= 7:
                should_notify = True

        # Check meeting count-based expiration
        if not should_notify:
            done_meetings_count = (
                self.db.query(MeetingModel)
                .filter(
                    and_(
                        MeetingModel.membership_id == membership.id,
                        MeetingModel.status == "done",
                    )
                )
                .count()
            )

            remaining_meetings = membership.total_meetings - done_meetings_count
            if remaining_meetings == 1:
                should_notify = True
                days_until_expiry = 0  # Last meeting

        if should_notify:
            # Get client name for the notification
            from app.models import Client as ClientModel

            client = (
                self.db.query(ClientModel)
                .filter(ClientModel.id == membership.client_id)
                .first()
            )
            client_name = client.name if client else "Unknown Client"

            # Create notification
            title = "Membership Expiring Soon"
            if days_until_expiry == 0:
                message = f"'{membership.name}' for {client_name} has only 1 meeting remaining."
            else:
                message = f"'{membership.name}' for {client_name} expires in {days_until_expiry} days."

            await self.create_notification(
                user_id=UUID(membership.user_id),
                notification_type=NotificationType.MEMBERSHIP_EXPIRING.value,
                title=title,
                message=message,
                related_entity_id=UUID(membership.id),
                related_entity_type="membership",
            )

    def _to_response(self, notification: NotificationModel) -> NotificationResponse:
        """Convert database model to response model"""
        return NotificationResponse(
            id=UUID(notification.id),
            user_id=UUID(notification.user_id),
            type=notification.type,
            title=notification.title,
            message=notification.message,
            related_entity_id=(
                UUID(notification.related_entity_id)
                if notification.related_entity_id
                else None
            ),
            related_entity_type=notification.related_entity_type,
            read=notification.read,
            read_at=ensure_utc(notification.read_at) if notification.read_at else None,
            created_at=ensure_utc(notification.created_at),
        )
