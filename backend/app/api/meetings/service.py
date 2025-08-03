import logging
from datetime import date, datetime, timedelta
from uuid import UUID, uuid4

from app.api.commons.shared import RecurrenceUpdateScope, ensure_utc
from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingStatus,
    MeetingUpdateRequest,
)
from app.models import Meeting as MeetingModel
from app.models import Membership as MembershipModel
from app.services.scheduler_service import scheduler_service
from app.storage.factory import StorageFactory

logger = logging.getLogger(__name__)


class MeetingService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=MeetingModel,
            response_class=MeetingResponse,
            table_name="meetings",
        )
        # Create separate storage for memberships (needed for business logic)
        self.membership_storage = StorageFactory.create_storage_service(
            model_class=MembershipModel,
            response_class=None,  # We'll handle responses manually
            table_name="memberships",
        )

    async def get_meetings(
        self,
        user_id: UUID,
        status: str | None = None,
        date_filter: date | None = None,
    ) -> list[MeetingResponse]:
        """Get meetings for a user, optionally filtered by status (string) and date"""
        filters = {}

        # Filter by status if provided
        if status:
            filters["status"] = status

        # Get all meetings first, then filter by date if needed
        meetings = await self.storage.get_all(user_id, filters)

        # Filter by date if provided
        if date_filter:
            from datetime import UTC

            start_of_day = datetime.combine(date_filter, datetime.min.time()).replace(
                tzinfo=UTC
            )
            end_of_day = datetime.combine(
                date_filter + timedelta(days=1), datetime.min.time()
            ).replace(tzinfo=UTC)

            meetings = [
                meeting
                for meeting in meetings
                if start_of_day <= meeting.start_time < end_of_day
            ]

        return meetings

    async def get_meeting(
        self, user_id: UUID, meeting_id: UUID
    ) -> MeetingResponse | None:
        """Get a specific meeting by ID"""
        return await self.storage.get_by_id(user_id, meeting_id)

    async def create_meeting(
        self, user_id: UUID, meeting: MeetingCreateRequest
    ) -> MeetingResponse:
        """Create a new meeting"""
        duration_hours = (meeting.end_time - meeting.start_time).total_seconds() / 3600
        price_total = duration_hours * meeting.price_per_hour

        meeting_data = {
            "id": str(uuid4()),
            "service_id": str(meeting.service_id),
            "client_id": str(meeting.client_id),
            "title": meeting.title,
            "recurrence_id": (
                str(meeting.recurrence_id) if meeting.recurrence_id else None
            ),
            "membership_id": (
                str(meeting.membership_id) if meeting.membership_id else None
            ),
            "start_time": ensure_utc(meeting.start_time),
            "end_time": ensure_utc(meeting.end_time),
            "price_per_hour": meeting.price_per_hour,
            "price_total": price_total,
            "status": (
                meeting.status
                if isinstance(meeting.status, str)
                else meeting.status.value
            ),
            "paid": meeting.paid,
        }

        # If this is the first meeting for a membership, set the start date
        if meeting.membership_id:
            await self._handle_membership_start_date(
                meeting.membership_id, ensure_utc(meeting.start_time)
            )

        created_meeting = await self.storage.create(user_id, meeting_data)

        # Schedule status update job if meeting is upcoming
        if created_meeting.status == MeetingStatus.UPCOMING.value:
            await scheduler_service.schedule_meeting_status_update(
                created_meeting.id, created_meeting.end_time
            )

        return created_meeting

    async def update_meeting(
        self, user_id: UUID, meeting_id: UUID, meeting: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update an existing meeting with recurrence support"""
        # Find the meeting to update
        existing_meeting = await self.storage.get_by_id(user_id, meeting_id)
        if not existing_meeting:
            raise ValueError("Meeting not found")

        # Check if this is a recurring meeting
        if existing_meeting.recurrence_id and meeting.update_scope:
            # Handle recurring meeting update based on scope
            return await self._update_recurring_meeting(
                user_id, existing_meeting, meeting
            )
        else:
            # Regular meeting update
            return await self._update_single_meeting(user_id, meeting_id, meeting)

    async def _update_single_meeting(
        self, user_id: UUID, meeting_id: UUID, update_data: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update a single meeting"""
        # Prepare update data
        update_fields = {}

        if update_data.service_id is not None:
            update_fields["service_id"] = str(update_data.service_id)
        if update_data.client_id is not None:
            update_fields["client_id"] = str(update_data.client_id)
        if update_data.title is not None:
            update_fields["title"] = update_data.title
        if update_data.recurrence_id is not None:
            update_fields["recurrence_id"] = str(update_data.recurrence_id)
        if update_data.membership_id is not None:
            update_fields["membership_id"] = str(update_data.membership_id)
        if update_data.start_time is not None:
            update_fields["start_time"] = ensure_utc(update_data.start_time)
        if update_data.end_time is not None:
            update_fields["end_time"] = ensure_utc(update_data.end_time)
        if update_data.price_per_hour is not None:
            update_fields["price_per_hour"] = update_data.price_per_hour
        if update_data.status is not None:
            status_value = (
                update_data.status
                if isinstance(update_data.status, str)
                else update_data.status.value
            )
            update_fields["status"] = status_value

            # Handle membership status update when meeting is marked as done
            if status_value == MeetingStatus.DONE.value:
                await self._update_membership_status(user_id)
        if update_data.paid is not None:
            update_fields["paid"] = update_data.paid

        # Recalculate price_total if time or price changed
        if (
            update_data.start_time is not None
            or update_data.end_time is not None
            or update_data.price_per_hour is not None
        ):
            # Get current meeting data to calculate new price
            current_meeting = await self.storage.get_by_id(user_id, meeting_id)
            if current_meeting:
                start_time = update_data.start_time or current_meeting["start_time"]
                end_time = update_data.end_time or current_meeting["end_time"]
                price_per_hour = (
                    update_data.price_per_hour or current_meeting["price_per_hour"]
                )

                duration_hours = (end_time - start_time).total_seconds() / 3600
                update_fields["price_total"] = duration_hours * price_per_hour

        updated_meeting = await self.storage.update(user_id, meeting_id, update_fields)
        if not updated_meeting:
            raise ValueError("Failed to update meeting")

        # Update scheduled job if end_time changed
        if update_data.end_time is not None:
            if updated_meeting.status == MeetingStatus.UPCOMING.value:
                await scheduler_service.schedule_meeting_status_update(
                    updated_meeting.id, updated_meeting.end_time
                )
            else:
                # Cancel job if status is no longer upcoming
                await scheduler_service.cancel_meeting_status_update(updated_meeting.id)

        return updated_meeting

    async def _update_recurring_meeting(
        self, user_id: UUID, meeting: MeetingResponse, update_data: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update a recurring meeting based on the specified scope"""
        # Validate update_scope
        if update_data.update_scope and update_data.update_scope not in [
            scope.value for scope in RecurrenceUpdateScope
        ]:
            raise ValueError(f"Invalid update_scope: {update_data.update_scope}")

        if update_data.update_scope == RecurrenceUpdateScope.THIS_MEETING_ONLY.value:
            # Update only this meeting
            return await self._update_single_meeting(user_id, meeting.id, update_data)

        elif update_data.update_scope == RecurrenceUpdateScope.THIS_AND_FUTURE.value:
            # Update this meeting and all future meetings in the recurrence
            # Update this meeting
            updated_meeting = await self._update_single_meeting(
                user_id, meeting.id, update_data
            )

            # Find and update all future meetings in the same recurrence
            future_meetings = await self.storage.get_all(
                user_id,
                {
                    "recurrence_id": str(meeting.recurrence_id),
                    "status": MeetingStatus.UPCOMING.value,
                },
            )

            # Filter for meetings after the current one
            future_meetings = [
                m for m in future_meetings if m["start_time"] > meeting.start_time
            ]

            for future_meeting in future_meetings:
                await self._update_single_meeting(
                    user_id, future_meeting["id"], update_data
                )

            return updated_meeting

        elif update_data.update_scope == RecurrenceUpdateScope.ALL_MEETINGS.value:
            # Update all meetings in the recurrence (including past ones)
            all_meetings = await self.storage.get_all(
                user_id, {"recurrence_id": str(meeting.recurrence_id)}
            )

            for all_meeting in all_meetings:
                await self._update_single_meeting(
                    user_id, all_meeting["id"], update_data
                )

            return await self._update_single_meeting(user_id, meeting.id, update_data)

        else:
            # Default to single meeting update
            return await self._update_single_meeting(user_id, meeting.id, update_data)

    async def delete_meeting(
        self, user_id: UUID, meeting_id: UUID, delete_scope: str | None = None
    ) -> bool:
        """Delete a meeting with optional recurrence scope"""
        # Check if meeting exists
        existing_meeting = await self.storage.get_by_id(user_id, meeting_id)
        if not existing_meeting:
            return False

        # Cancel scheduled job before deleting
        await scheduler_service.cancel_meeting_status_update(meeting_id)

        # If this is a recurring meeting and a scope is specified, handle recurrence deletion
        if existing_meeting.recurrence_id and delete_scope:
            return await self._delete_recurring_meeting(
                user_id, existing_meeting, delete_scope
            )
        else:
            # Regular single meeting deletion
            success = await self.storage.delete(user_id, meeting_id)
            return success

    async def _delete_recurring_meeting(
        self, user_id: UUID, meeting: MeetingResponse, delete_scope: str
    ) -> bool:
        """Delete a recurring meeting based on the specified scope"""
        # Validate delete_scope
        valid_scopes = ["this_meeting_only", "this_and_future", "all_meetings"]
        if delete_scope not in valid_scopes:
            raise ValueError(f"Invalid delete_scope: {delete_scope}")

        if delete_scope == "this_meeting_only":
            # Delete only this meeting
            return await self.storage.delete(user_id, meeting.id)

        elif delete_scope == "this_and_future":
            # Delete this meeting and all future meetings in the recurrence
            # Delete this meeting
            await self.storage.delete(user_id, meeting.id)

            # Find and delete all future meetings in the same recurrence
            future_meetings = await self.storage.get_all(
                user_id,
                {
                    "recurrence_id": str(meeting.recurrence_id),
                    "status": MeetingStatus.UPCOMING.value,
                },
            )

            # Filter for meetings after the current one
            future_meetings = [
                m for m in future_meetings if m["start_time"] > meeting.start_time
            ]

            for future_meeting in future_meetings:
                await scheduler_service.cancel_meeting_status_update(
                    future_meeting["id"]
                )
                await self.storage.delete(user_id, future_meeting["id"])

            return True

        elif delete_scope == "all_meetings":
            # Delete all meetings in the recurrence (including past ones)
            all_meetings = await self.storage.get_all(
                user_id, {"recurrence_id": str(meeting.recurrence_id)}
            )

            for all_meeting in all_meetings:
                await scheduler_service.cancel_meeting_status_update(all_meeting["id"])
                await self.storage.delete(user_id, all_meeting["id"])

            return True

        else:
            # Default to single meeting deletion
            return await self.storage.delete(user_id, meeting.id)

    async def get_recurring_meetings(
        self, user_id: UUID, recurrence_id: UUID
    ) -> list[MeetingResponse]:
        """Get all meetings for a specific recurrence"""
        return await self.storage.get_all(
            user_id, {"recurrence_id": str(recurrence_id)}
        )

    async def _handle_membership_start_date(
        self, membership_id: UUID, start_date: datetime
    ) -> None:
        """Handle setting membership start date when first meeting is created"""
        # First, we need to get the membership to find its user_id
        # We'll use a direct query to get the membership without user_id filter
        try:
            # Get the membership directly by ID to find its user_id
            result = (
                self.membership_storage.supabase.table("memberships")
                .select("*")
                .eq("id", str(membership_id))
                .execute()
            )

            if result.data and result.data[0]:
                membership = result.data[0]
                user_id = UUID(membership["user_id"])

                # Set the start date if not already set (regardless of payment status)
                if not membership.get("start_date"):
                    await self.membership_storage.update(
                        user_id=user_id,
                        entity_id=membership_id,
                        update_data={"start_date": start_date},
                    )
                    logger.info(
                        f"Set start date for membership {membership_id} to {start_date}"
                    )
                else:
                    logger.info(
                        f"Membership {membership_id} already has start date: {membership.get('start_date')}"
                    )
            else:
                logger.warning(
                    f"Membership {membership_id} not found when trying to set start date"
                )
        except Exception as e:
            # Log the error but don't fail the meeting creation
            logger.warning(
                f"Failed to handle membership start date for membership {membership_id}: {e}"
            )
            pass

    async def _update_membership_status(self, user_id: UUID) -> None:
        """Update membership status when a meeting is marked as done"""
        try:
            # Import and use the membership service to update membership statuses
            from app.api.memberships.service import MembershipService

            membership_service = MembershipService()
            await membership_service.update_membership_status(user_id)
            logger.info(f"Updated membership statuses for user {user_id}")
        except Exception as e:
            # Log the error but don't fail the meeting update
            logger.warning(
                f"Failed to update membership status for user {user_id}: {e}"
            )
            pass

    async def meeting_exists(self, user_id: UUID, meeting_id: UUID) -> bool:
        """Check if a meeting exists"""
        return await self.storage.exists(user_id, meeting_id)
