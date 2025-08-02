import logging
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.api.notifications.model import (
    NotificationResponse,
    NotificationUpdateRequest,
)
from app.models import (
    Client as ClientModel,
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
from app.storage.factory import StorageFactory

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=NotificationModel,
            response_class=NotificationResponse,
            table_name="notifications",
        )
        # Create separate storage for memberships, meetings, and clients (needed for business logic)
        self.membership_storage = StorageFactory.create_storage_service(
            model_class=MembershipModel,
            response_class=None,  # We'll handle responses manually
            table_name="memberships",
        )
        self.meeting_storage = StorageFactory.create_storage_service(
            model_class=MeetingModel,
            response_class=None,  # We'll handle responses manually
            table_name="meetings",
        )
        self.client_storage = StorageFactory.create_storage_service(
            model_class=ClientModel,
            response_class=None,  # We'll handle responses manually
            table_name="clients",
        )

    async def get_notifications(
        self, user_id: UUID, unread_only: bool = False
    ) -> list[NotificationResponse]:
        """Get notifications for a user, optionally filtered to unread only"""
        filters = {}
        if unread_only:
            filters["read"] = False

        notifications = await self.storage.get_all(user_id, filters)
        # Sort by created_at descending (newest first)
        notifications.sort(key=lambda x: x.created_at, reverse=True)
        return notifications

    async def get_notification(
        self, user_id: UUID, notification_id: UUID
    ) -> NotificationResponse | None:
        """Get a specific notification by ID"""
        return await self.storage.get_by_id(user_id, notification_id)

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
        existing_notifications = await self.storage.get_all(
            user_id,
            {
                "related_entity_id": (
                    str(related_entity_id) if related_entity_id else None
                ),
                "related_entity_type": related_entity_type,
            },
        )

        if existing_notifications:
            return existing_notifications[0]

        notification_data = {
            "id": str(uuid4()),
            "type": notification_type,
            "title": title,
            "message": message,
            "related_entity_id": str(related_entity_id) if related_entity_id else None,
            "related_entity_type": related_entity_type,
            "read": False,
        }

        return await self.storage.create(user_id, notification_data)

    async def update_notification(
        self,
        user_id: UUID,
        notification_id: UUID,
        update_data: NotificationUpdateRequest,
    ) -> NotificationResponse:
        """Update a notification"""
        # First check if notification exists
        existing_notification = await self.storage.get_by_id(user_id, notification_id)
        if not existing_notification:
            raise ValueError("Notification not found")

        # Prepare update data
        update_fields = {}
        if update_data.read is not None:
            update_fields["read"] = update_data.read
            if update_data.read:
                update_fields["read_at"] = datetime.now()
            else:
                update_fields["read_at"] = None

        updated_notification = await self.storage.update(
            user_id, notification_id, update_fields
        )
        if not updated_notification:
            raise ValueError("Failed to update notification")

        return updated_notification

    async def mark_notifications_read(
        self, user_id: UUID, notification_ids: list[UUID]
    ) -> list[NotificationResponse]:
        """Mark multiple notifications as read"""
        updated_notifications = []

        for notification_id in notification_ids:
            try:
                updated_notification = await self.update_notification(
                    user_id, notification_id, NotificationUpdateRequest(read=True)
                )
                updated_notifications.append(updated_notification)
            except ValueError:
                # Skip notifications that don't exist or don't belong to user
                continue

        return updated_notifications

    async def delete_notification(self, user_id: UUID, notification_id: UUID) -> None:
        """Delete a notification"""
        # Check if notification exists
        existing_notification = await self.storage.get_by_id(user_id, notification_id)
        if not existing_notification:
            raise ValueError("Notification not found")

        success = await self.storage.delete(user_id, notification_id)
        if not success:
            raise ValueError("Failed to delete notification")

    async def check_membership_expiration_warnings(self, user_id: UUID) -> None:
        """Check for membership expiration warnings and create notifications"""
        # Get active memberships
        active_memberships = await self.membership_storage.get_all(
            user_id, {"status": "active"}
        )

        for membership in active_memberships:
            await self._check_single_membership_expiration(membership)

    async def _check_single_membership_expiration(self, membership: dict) -> None:
        """Check if a single membership is about to expire and create notification if needed"""
        # Check if we already have a recent notification for this membership
        recent_notifications = await self.storage.get_all(
            UUID(membership["user_id"]),
            {
                "type": NotificationType.MEMBERSHIP_EXPIRING.value,
                "related_entity_id": membership["id"],
            },
        )

        # Filter for notifications created in the last day
        recent_notifications = [
            n
            for n in recent_notifications
            if n.created_at >= datetime.now() - timedelta(days=1)
        ]

        if recent_notifications:
            return  # Already notified recently

        should_notify = False
        days_until_expiry = None

        # Check time-based expiration
        if membership.get("start_date"):
            start_date = membership["start_date"]
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))

            expiration_date = start_date + timedelta(
                days=membership["availability_days"]
            )
            days_until_expiry = (expiration_date - datetime.now()).days

            if 0 <= days_until_expiry <= 7:
                should_notify = True

        # Check meeting count-based expiration
        if not should_notify:
            done_meetings = await self.meeting_storage.get_all(
                UUID(membership["user_id"]),
                {"membership_id": membership["id"], "status": "done"},
            )

            done_meetings_count = len(done_meetings)
            remaining_meetings = membership["total_meetings"] - done_meetings_count
            if remaining_meetings == 1:
                should_notify = True
                days_until_expiry = 0  # Last meeting

        if should_notify:
            # Get client name for the notification
            client_name = await self._get_client_name(
                UUID(membership["user_id"]), UUID(membership["client_id"])
            )

            # Create notification
            title = "Membership Expiring Soon"
            if days_until_expiry == 0:
                message = f"'{membership['name']}' for {client_name} has only 1 meeting remaining."
            else:
                message = f"'{membership['name']}' for {client_name} expires in {days_until_expiry} days."

            await self.create_notification(
                user_id=UUID(membership["user_id"]),
                notification_type=NotificationType.MEMBERSHIP_EXPIRING.value,
                title=title,
                message=message,
                related_entity_id=UUID(membership["id"]),
                related_entity_type="membership",
            )

    async def _get_client_name(self, user_id: UUID, client_id: UUID) -> str:
        """Get client name by ID"""
        try:
            client = await self.client_storage.get_by_id(user_id, client_id)
            if client:
                return client.get("name", "Unknown Client")
            return "Unknown Client"
        except Exception as e:
            logger.warning(f"Failed to get client name for client {client_id}: {e}")
            return "Unknown Client"

    async def notification_exists(self, user_id: UUID, notification_id: UUID) -> bool:
        """Check if a notification exists"""
        return await self.storage.exists(user_id, notification_id)
