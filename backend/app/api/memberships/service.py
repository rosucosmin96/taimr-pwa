import logging
from datetime import datetime, timedelta
from uuid import UUID, uuid4

from app.api.memberships.model import (
    MembershipCreateRequest,
    MembershipResponse,
    MembershipStatus,
    MembershipUpdateRequest,
)
from app.api.notifications.service import NotificationService
from app.models import Meeting as MeetingModel
from app.models import Membership as MembershipModel
from app.models.notification import NotificationType
from app.storage.factory import StorageFactory

logger = logging.getLogger(__name__)


class MembershipService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=MembershipModel,
            response_class=MembershipResponse,
            table_name="memberships",
        )
        # Create separate storage for meetings (needed for membership logic)
        self.meeting_storage = StorageFactory.create_storage_service(
            model_class=MeetingModel,
            response_class=None,  # We'll handle meeting responses manually
            table_name="meetings",
        )

    async def get_memberships(self, user_id: UUID) -> list[MembershipResponse]:
        """Get all memberships for a user."""
        return await self.storage.get_all(user_id)

    async def get_membership(
        self, user_id: UUID, membership_id: UUID
    ) -> MembershipResponse | None:
        """Get a specific membership by ID."""
        return await self.storage.get_by_id(user_id, membership_id)

    async def create_membership(
        self, user_id: UUID, membership: MembershipCreateRequest
    ) -> MembershipResponse:
        """Create a new membership."""
        # Calculate price per meeting
        price_per_meeting = membership.price_per_membership / membership.total_meetings

        # Check if client already has an active membership
        existing_active = await self._get_active_membership_by_client(
            user_id, membership.client_id
        )
        if existing_active:
            raise ValueError("Client already has an active membership")

        membership_data = {
            "id": str(uuid4()),
            "service_id": str(membership.service_id),
            "client_id": str(membership.client_id),
            "name": membership.name,
            "total_meetings": membership.total_meetings,
            "price_per_membership": membership.price_per_membership,
            "price_per_meeting": price_per_meeting,
            "availability_days": membership.availability_days,
            "status": MembershipStatus.ACTIVE.value,
            "paid": False,
            "start_date": None,  # Will be set when first meeting is created
        }

        return await self.storage.create(user_id, membership_data)

    async def update_membership(
        self, user_id: UUID, membership_id: UUID, membership: MembershipUpdateRequest
    ) -> MembershipResponse:
        """Update an existing membership."""
        # First check if membership exists
        existing_membership = await self.storage.get_by_id(user_id, membership_id)
        if not existing_membership:
            raise ValueError("Membership not found")

        # Prepare update data
        update_data = {}

        if membership.name is not None:
            update_data["name"] = membership.name
        if membership.total_meetings is not None:
            update_data["total_meetings"] = membership.total_meetings
            # Recalculate price per meeting
            update_data["price_per_meeting"] = (
                existing_membership["price_per_membership"] / membership.total_meetings
            )
        if membership.price_per_membership is not None:
            update_data["price_per_membership"] = membership.price_per_membership
            # Recalculate price per meeting
            update_data["price_per_meeting"] = (
                membership.price_per_membership / existing_membership["total_meetings"]
            )
        if membership.availability_days is not None:
            update_data["availability_days"] = membership.availability_days
        if membership.status is not None:
            update_data["status"] = membership.status.value
        if membership.paid is not None:
            update_data["paid"] = membership.paid
            # If paid is set to True, set all meetings for this membership to paid
            if membership.paid:
                await self._update_membership_meetings_paid(membership_id, True)

        updated_membership = await self.storage.update(
            user_id, membership_id, update_data
        )
        if not updated_membership:
            raise ValueError("Failed to update membership")

        return updated_membership

    async def delete_membership(self, user_id: UUID, membership_id: UUID) -> None:
        """Delete (cancel) a membership."""
        # Check if membership exists
        existing_membership = await self.storage.get_by_id(user_id, membership_id)
        if not existing_membership:
            raise ValueError("Membership not found")

        # Cancel the membership instead of deleting
        await self.storage.update(
            user_id, membership_id, {"status": MembershipStatus.CANCELED.value}
        )

    async def get_active_membership(
        self, user_id: UUID, client_id: UUID
    ) -> MembershipResponse | None:
        """Get the active membership for a client."""
        return await self._get_active_membership_by_client(user_id, client_id)

    async def get_membership_meetings(
        self, user_id: UUID, membership_id: UUID
    ) -> list[dict]:
        """Get all meetings for a membership."""
        # Get meetings filtered by membership_id
        meetings = await self.meeting_storage.get_all(
            user_id, {"membership_id": str(membership_id)}
        )

        return [
            {
                "id": meeting["id"],
                "title": meeting["title"],
                "start_time": meeting["start_time"],
                "end_time": meeting["end_time"],
                "status": meeting["status"],
                "paid": meeting["paid"],
            }
            for meeting in meetings
        ]

    async def update_membership_status(self, user_id: UUID) -> None:
        """Update membership status based on expiration rules."""
        memberships = await self.storage.get_all(
            user_id, {"status": MembershipStatus.ACTIVE.value}
        )

        for membership in memberships:
            should_expire = False
            should_notify_availability = False
            should_notify_expiring = False

            # Check time-based expiration
            if membership["start_date"]:
                expiration_date = membership["start_date"] + timedelta(
                    days=membership["availability_days"]
                )
                if datetime.now() > expiration_date:
                    should_expire = True
                elif datetime.now() > expiration_date - timedelta(days=7):
                    should_notify_availability = True

            # Check meeting count-based expiration
            if not should_expire:
                done_meetings_count = await self._get_done_meetings_count(
                    str(membership["id"])
                )

                if done_meetings_count >= membership["total_meetings"]:
                    should_expire = True
                elif membership["total_meetings"] - done_meetings_count == 1:
                    should_notify_expiring = True

            if should_expire:
                await self.storage.update(
                    user_id,
                    membership["id"],
                    {"status": MembershipStatus.EXPIRED.value},
                )
            elif should_notify_availability:
                await self._create_notification(
                    user_id=membership["user_id"],
                    title=f"Membership {membership['name']} Expiring Soon",
                    message=f"Your membership for {membership['name']} is expiring on {membership['start_date'] + timedelta(days=membership['availability_days'])}.",
                    related_entity_id=membership["id"],
                    related_entity_type="membership",
                )
            elif should_notify_expiring:
                await self._create_notification(
                    user_id=membership["user_id"],
                    title=f"Membership {membership['name']} Expiring Soon",
                    message=f"Your membership for {membership['name']} has only one meeting left.",
                    related_entity_id=membership["id"],
                    related_entity_type="membership",
                )

    async def set_membership_start_date(
        self, membership_id: UUID, start_date: datetime
    ) -> None:
        """Set the start date of a membership when the first meeting is created."""
        try:
            # Get the membership to find its user_id
            result = (
                self.storage.supabase.table("memberships")
                .select("user_id")
                .eq("id", str(membership_id))
                .execute()
            )

            if result.data and result.data[0]:
                user_id = UUID(result.data[0]["user_id"])

                # Update the membership start date
                await self.storage.update(
                    user_id=user_id,
                    entity_id=membership_id,
                    update_data={"start_date": start_date},
                )
                logger.info(
                    f"Manually set start date for membership {membership_id} to {start_date}"
                )
            else:
                logger.warning(
                    f"Membership {membership_id} not found when trying to set start date"
                )
        except Exception as e:
            logger.error(
                f"Failed to set membership start date for membership {membership_id}: {e}"
            )
            raise

    async def _get_active_membership_by_client(
        self, user_id: UUID, client_id: UUID
    ) -> MembershipResponse | None:
        """Get the active membership for a client."""
        memberships = await self.storage.get_all(
            user_id,
            {"client_id": str(client_id), "status": MembershipStatus.ACTIVE.value},
        )
        return memberships[0] if memberships else None

    async def _get_done_meetings_count(self, membership_id: str) -> int:
        """Get the count of done meetings for a membership."""
        try:
            # First get the membership to find its user_id
            result = (
                self.storage.supabase.table("memberships")
                .select("user_id")
                .eq("id", membership_id)
                .execute()
            )

            if result.data and result.data[0]:
                user_id = UUID(result.data[0]["user_id"])
                meetings = await self.meeting_storage.get_all(
                    user_id=user_id,
                    filters={"membership_id": membership_id, "status": "done"},
                )
                return len(meetings)
            return 0
        except Exception as e:
            # Log the error but don't fail the operation
            logger.warning(
                f"Failed to get done meetings count for membership {membership_id}: {e}"
            )
            return 0

    async def _update_membership_meetings_paid(
        self, membership_id: UUID, paid: bool
    ) -> None:
        """Update all meetings for a membership to paid status."""
        try:
            # Get the membership to find its user_id
            result = (
                self.storage.supabase.table("memberships")
                .select("user_id")
                .eq("id", str(membership_id))
                .execute()
            )

            if result.data and result.data[0]:
                user_id = UUID(result.data[0]["user_id"])

                # Get all meetings for this membership
                meetings = await self.meeting_storage.get_all(
                    user_id=user_id, filters={"membership_id": str(membership_id)}
                )

                # Update each meeting's paid status
                for meeting in meetings:
                    await self.meeting_storage.update(
                        user_id=user_id,
                        entity_id=meeting["id"],
                        update_data={"paid": paid},
                    )

                logger.info(
                    f"Updated {len(meetings)} meetings for membership {membership_id} to paid={paid}"
                )
            else:
                logger.warning(
                    f"Membership {membership_id} not found when trying to update meetings paid status"
                )
        except Exception as e:
            logger.error(
                f"Failed to update meetings paid status for membership {membership_id}: {e}"
            )
            raise

    async def _create_notification(
        self,
        user_id: UUID,
        title: str,
        message: str,
        related_entity_id: UUID,
        related_entity_type: str,
    ) -> None:
        """Create a notification."""
        try:
            # Use the notification service to create the notification
            notification_service = NotificationService()

            # Determine notification type based on the title/message
            if "expiring" in title.lower():
                notification_type = NotificationType.MEMBERSHIP_EXPIRING.value
            elif "expired" in title.lower():
                notification_type = NotificationType.MEMBERSHIP_EXPIRED.value
            else:
                notification_type = (
                    NotificationType.MEMBERSHIP_EXPIRING.value
                )  # Default

            await notification_service.create_notification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                related_entity_id=related_entity_id,
                related_entity_type=related_entity_type,
            )
            logger.info(f"Created notification for user {user_id}: {title}")
        except Exception as e:
            # Log the error but don't fail the membership operation
            logger.warning(f"Failed to create notification for user {user_id}: {e}")
            pass
