from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.api.commons.shared import RecurrenceUpdateScope, ensure_utc
from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingStatus,
    MeetingUpdateRequest,
)
from app.api.meetings.service import MeetingService
from app.api.recurrences.model import (
    RecurrenceCreateRequest,
    RecurrenceException,
    RecurrenceFrequency,
    RecurrenceResponse,
    RecurrenceUpdateRequest,
)
from app.models import (
    Recurrence as RecurrenceModel,
)
from app.storage.factory import StorageFactory

# logger = logging.getLogger(__name__)


class RecurrenceService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=RecurrenceModel,
            response_class=RecurrenceResponse,
            table_name="recurrences",
        )
        # Use MeetingService for meeting operations
        self.meeting_service = MeetingService()
        # Add meeting storage for direct operations
        from app.api.meetings.model import MeetingResponse as MeetingResponseModel
        from app.models import Meeting as MeetingModel

        self.meeting_storage = StorageFactory.create_storage_service(
            model_class=MeetingModel,
            response_class=MeetingResponseModel,
            table_name="meetings",
        )

    def _generate_meeting_instances(
        self, recurrence: RecurrenceResponse, start_date: datetime, end_date: datetime
    ) -> list[MeetingCreateRequest]:
        """Generate meeting instances for a recurrence pattern"""
        instances = []
        current_date = start_date

        while current_date <= end_date:
            # Create meeting instance using the time conversion methods
            # The start_time and end_time are in HH:mm format and represent UTC time
            start_time_obj = recurrence.get_start_time()
            end_time_obj = recurrence.get_end_time()

            # Create datetime in UTC by combining the UTC date with UTC time
            start_datetime = datetime.combine(
                current_date.date(), start_time_obj
            ).replace(tzinfo=UTC)
            end_datetime = datetime.combine(current_date.date(), end_time_obj).replace(
                tzinfo=UTC
            )

            instance = MeetingCreateRequest(
                service_id=recurrence.service_id,
                client_id=recurrence.client_id,
                title=recurrence.title,
                recurrence_id=recurrence.id,
                start_time=start_datetime,
                end_time=end_datetime,
                price_per_hour=recurrence.price_per_hour,
                status=MeetingStatus.UPCOMING,
                paid=False,
            )
            instances.append(instance)

            # Calculate next occurrence based on frequency
            if recurrence.frequency == RecurrenceFrequency.WEEKLY:
                current_date += timedelta(weeks=1)
            elif recurrence.frequency == RecurrenceFrequency.BIWEEKLY:
                current_date += timedelta(weeks=2)
            elif recurrence.frequency == RecurrenceFrequency.MONTHLY:
                # Simple monthly increment (could be enhanced for exact month handling)
                if current_date.month == 12:
                    current_date = current_date.replace(
                        year=current_date.year + 1, month=1
                    )
                else:
                    current_date = current_date.replace(month=current_date.month + 1)

        return instances

    async def get_recurrence(
        self, user_id: UUID, recurrence_id: UUID
    ) -> RecurrenceResponse | None:
        """Get a specific recurrence by ID"""
        return await self.storage.get_by_id(user_id, recurrence_id)

    async def create_recurrence_with_membership_check(
        self, user_id: UUID, recurrence: RecurrenceCreateRequest
    ) -> dict:
        """
        Create a new recurrence with membership awareness and detailed feedback.
        Returns both the recurrence and information about any limitations applied.
        """
        # Check for active membership only if user explicitly wants to use it
        from app.api.memberships.service import MembershipService

        membership_service = MembershipService()
        active_membership = None
        membership_info = None

        if recurrence.use_membership:
            active_membership = (
                await membership_service.get_available_active_membership(
                    user_id, recurrence.client_id
                )
            )

        # Calculate how many meetings can be created
        max_meetings = None

        if active_membership:
            # Use the new method that considers both completed and scheduled meetings
            membership_availability = (
                await membership_service.get_membership_available_meetings(
                    user_id, active_membership.id
                )
            )
            available_meetings = membership_availability["available_meetings"]
            max_meetings = available_meetings
            membership_info = {
                "membership_id": active_membership.id,
                "membership_name": active_membership.name,
                "available_meetings": available_meetings,
                "price_per_meeting": active_membership.price_per_meeting,
                "total_meetings": membership_availability["total_meetings"],
                "completed_meetings": membership_availability["completed_meetings"],
                "scheduled_meetings": membership_availability["scheduled_meetings"],
            }

        recurrence_data = {
            "id": str(uuid4()),
            "service_id": str(recurrence.service_id),
            "client_id": str(recurrence.client_id),
            "frequency": recurrence.frequency.value,
            "start_date": ensure_utc(recurrence.start_date),
            "end_date": (
                ensure_utc(recurrence.end_date) if recurrence.end_date else None
            ),
            "title": recurrence.title,
            "start_time": recurrence.start_time,
            "end_time": recurrence.end_time,
            "price_per_hour": recurrence.price_per_hour,
        }

        created_recurrence = await self.storage.create(user_id, recurrence_data)

        # Generate meeting instances using the processed UTC dates from the created recurrence
        all_instances = self._generate_meeting_instances(
            created_recurrence,
            created_recurrence.start_date,
            created_recurrence.end_date,
        )

        # Limit instances based on membership if applicable
        instances_to_create = all_instances
        limitation_info = None

        if max_meetings is not None and len(all_instances) > max_meetings:
            instances_to_create = all_instances[:max_meetings]
            limitation_info = {
                "total_possible_meetings": len(all_instances),
                "meetings_created": len(instances_to_create),
                "membership_name": membership_info["membership_name"],
                "available_meetings": membership_info["available_meetings"],
                "total_meetings": membership_info["total_meetings"],
                "completed_meetings": membership_info["completed_meetings"],
                "scheduled_meetings": membership_info["scheduled_meetings"],
                "message": f"Only {len(instances_to_create)} meetings were created due to membership limit. "
                f"Membership '{membership_info['membership_name']}' has {membership_info['available_meetings']} meetings available "
                f"(completed: {membership_info['completed_meetings']}, scheduled: {membership_info['scheduled_meetings']}, total: {membership_info['total_meetings']}).",
            }

        # Create the meeting instances
        created_meetings = []
        for _i, instance in enumerate(instances_to_create):
            # Use membership pricing if available and membership was requested
            if membership_info and _i < membership_info["available_meetings"]:
                instance.price_per_hour = membership_info["price_per_meeting"]
                instance.membership_id = membership_info["membership_id"]

            # Create meeting using MeetingService to ensure all business logic is applied
            created_meeting = await self.meeting_service.create_meeting(
                user_id, instance
            )
            created_meetings.append(created_meeting)

        return {
            "recurrence": created_recurrence,
            "meetings_created": len(created_meetings),
            "limitation_info": limitation_info,
            "membership_used": membership_info is not None,
        }

    async def create_recurrence(
        self, user_id: UUID, recurrence: RecurrenceCreateRequest
    ) -> RecurrenceResponse:
        """Create a new recurrence and generate future meetings, respecting membership limits"""
        # Check for active membership only if user explicitly wants to use it
        from app.api.memberships.service import MembershipService

        membership_service = MembershipService()
        active_membership = None
        membership_info = None

        if recurrence.use_membership:
            active_membership = (
                await membership_service.get_available_active_membership(
                    user_id, recurrence.client_id
                )
            )

        # Calculate how many meetings can be created
        max_meetings = None

        if active_membership:
            # Use the new method that considers both completed and scheduled meetings
            membership_availability = (
                await membership_service.get_membership_available_meetings(
                    user_id, active_membership.id
                )
            )
            available_meetings = membership_availability["available_meetings"]
            max_meetings = available_meetings
            membership_info = {
                "membership_id": active_membership.id,
                "membership_name": active_membership.name,
                "available_meetings": available_meetings,
                "price_per_meeting": active_membership.price_per_meeting,
            }

        recurrence_data = {
            "id": str(uuid4()),
            "service_id": str(recurrence.service_id),
            "client_id": str(recurrence.client_id),
            "frequency": recurrence.frequency.value,
            "start_date": ensure_utc(recurrence.start_date),
            "end_date": (
                ensure_utc(recurrence.end_date) if recurrence.end_date else None
            ),
            "title": recurrence.title,
            "start_time": recurrence.start_time,
            "end_time": recurrence.end_time,
            "price_per_hour": recurrence.price_per_hour,
        }

        created_recurrence = await self.storage.create(user_id, recurrence_data)

        # Generate meeting instances using the processed UTC dates from the created recurrence
        all_instances = self._generate_meeting_instances(
            created_recurrence,
            created_recurrence.start_date,
            created_recurrence.end_date,
        )

        # Limit instances based on membership if applicable
        instances_to_create = all_instances
        if max_meetings is not None and len(all_instances) > max_meetings:
            instances_to_create = all_instances[:max_meetings]

        # Create the meeting instances
        created_meetings = []
        for _i, instance in enumerate(instances_to_create):
            # Use membership pricing if available and membership was requested
            if membership_info and _i < membership_info["available_meetings"]:
                instance.price_per_hour = membership_info["price_per_meeting"]
                instance.membership_id = membership_info["membership_id"]

            # Create meeting using MeetingService to ensure all business logic is applied
            created_meeting = await self.meeting_service.create_meeting(
                user_id, instance
            )
            created_meetings.append(created_meeting)

        # Store membership limitation info in the recurrence for frontend notification
        if membership_info and len(all_instances) > max_meetings:
            created_recurrence.membership_limitation = {
                "total_possible_meetings": len(all_instances),
                "meetings_created": len(created_meetings),
                "membership_name": membership_info["membership_name"],
                "available_meetings": membership_info["available_meetings"],
            }

        return created_recurrence

    async def update_recurrence(
        self, user_id: UUID, recurrence_id: UUID, recurrence: RecurrenceUpdateRequest
    ) -> RecurrenceResponse:
        """Update a recurrence and apply changes to all future meetings"""
        # First check if recurrence exists
        existing_recurrence = await self.storage.get_by_id(user_id, recurrence_id)
        if not existing_recurrence:
            raise ValueError("Recurrence not found")

        # Prepare update data
        update_fields = {}

        if recurrence.service_id is not None:
            update_fields["service_id"] = str(recurrence.service_id)
        if recurrence.client_id is not None:
            update_fields["client_id"] = str(recurrence.client_id)
        if recurrence.frequency is not None:
            update_fields["frequency"] = recurrence.frequency.value
        if recurrence.start_date is not None:
            update_fields["start_date"] = recurrence.start_date
        if recurrence.end_date is not None:
            update_fields["end_date"] = recurrence.end_date
        if recurrence.title is not None:
            update_fields["title"] = recurrence.title
        if recurrence.start_time is not None:
            update_fields["start_time"] = recurrence.start_time
        if recurrence.end_time is not None:
            update_fields["end_time"] = recurrence.end_time
        if recurrence.price_per_hour is not None:
            update_fields["price_per_hour"] = recurrence.price_per_hour

        updated_recurrence = await self.storage.update(
            user_id, recurrence_id, update_fields
        )
        if not updated_recurrence:
            raise ValueError("Failed to update recurrence")

        return updated_recurrence

    async def delete_recurrence(self, user_id: UUID, recurrence_id: UUID) -> bool:
        """Delete a recurrence and all associated future meetings"""
        # Check if recurrence exists
        existing_recurrence = await self.storage.get_by_id(user_id, recurrence_id)
        if not existing_recurrence:
            return False

        # Delete all associated meetings
        meetings = await self.meeting_service.get_recurring_meetings(
            user_id, recurrence_id
        )

        for meeting in meetings:
            await self.meeting_service.delete_meeting(user_id, meeting.id)

        # Delete the recurrence
        success = await self.storage.delete(user_id, recurrence_id)
        return success

    async def get_recurrence_meetings(
        self, user_id: UUID, recurrence_id: UUID
    ) -> list[MeetingResponse]:
        """Get all meetings for a specific recurrence"""
        return await self.meeting_service.get_recurring_meetings(user_id, recurrence_id)

    async def update_recurring_meeting(
        self,
        user_id: UUID,
        meeting_id: UUID,
        update_data: "MeetingUpdateRequest",
    ) -> list["MeetingResponse"]:
        """Update a recurring meeting based on the specified scope"""

        # Get the meeting to update
        meeting = await self.meeting_service.get_meeting(user_id, meeting_id)
        if not meeting:
            raise ValueError("Meeting not found")

        # Check if this is a recurring meeting
        if not meeting.recurrence_id:
            # Single meeting update
            updated_meeting = await self.meeting_service.update_meeting(
                user_id, meeting_id, update_data
            )
            return [updated_meeting]

        # Handle recurring meeting updates
        if update_data.update_scope == RecurrenceUpdateScope.THIS_MEETING_ONLY.value:
            # Update only this meeting
            updated_meeting = await self.meeting_service.update_meeting(
                user_id, meeting_id, update_data
            )
            return [updated_meeting]

        elif update_data.update_scope == RecurrenceUpdateScope.THIS_AND_FUTURE.value:
            # Update this meeting and all future meetings
            updated_meetings = await self._update_recurring_meetings_with_scope(
                user_id, meeting, update_data, "future"
            )

            # After updating meetings, update the recurrence pattern to match the edited meeting
            if update_data.start_time is not None or update_data.end_time is not None:
                try:
                    await self._update_recurrence_pattern(
                        user_id, meeting.recurrence_id, update_data
                    )
                except Exception:
                    # Don't fail the entire operation if recurrence pattern update fails
                    pass

            return updated_meetings

        elif update_data.update_scope == RecurrenceUpdateScope.ALL_MEETINGS.value:
            # Update all meetings in the recurrence
            updated_meetings = await self._update_recurring_meetings_with_scope(
                user_id, meeting, update_data, "all"
            )

            # After updating meetings, update the recurrence pattern to match the edited meeting
            if update_data.start_time is not None or update_data.end_time is not None:
                try:
                    await self._update_recurrence_pattern(
                        user_id, meeting.recurrence_id, update_data
                    )
                except Exception:
                    # Don't fail the entire operation if recurrence pattern update fails
                    pass

            return updated_meetings

        else:
            # Default to single meeting update
            updated_meeting = await self.meeting_service.update_meeting(
                user_id, meeting_id, update_data
            )
            return [updated_meeting]

    async def _update_recurring_meetings_with_scope(
        self,
        user_id: UUID,
        original_meeting: "MeetingResponse",
        update_data: "MeetingUpdateRequest",
        scope: str,
    ) -> list["MeetingResponse"]:
        """Update recurring meetings with intelligent field detection"""
        from app.api.meetings.model import MeetingUpdateRequest

        # Get all meetings in the recurrence
        all_meetings = await self.meeting_service.get_recurring_meetings(
            user_id, original_meeting.recurrence_id
        )

        # Sort meetings by start time to understand the pattern
        all_meetings.sort(key=lambda m: m.start_time)

        # Filter meetings based on scope
        if scope == "future":
            meetings_to_update = [
                m for m in all_meetings if m.start_time >= original_meeting.start_time
            ]
        else:  # scope == "all"
            meetings_to_update = all_meetings

        # Calculate time offsets if time fields are being updated
        time_offset_start = None
        time_offset_end = None

        # Get the recurrence to find the original times
        recurrence = await self.get_recurrence(user_id, original_meeting.recurrence_id)

        if recurrence:
            # Convert recurrence time strings to datetime for comparison
            meeting_date = original_meeting.start_time.date()
            from datetime import time

            recurrence_start_time = time.fromisoformat(recurrence.start_time)
            recurrence_end_time = time.fromisoformat(recurrence.end_time)

            # Create datetime objects for the original pattern times
            original_pattern_start = datetime.combine(
                meeting_date, recurrence_start_time
            )
            original_pattern_end = datetime.combine(meeting_date, recurrence_end_time)

            # Make sure the pattern times have the same timezone as the update data
            if update_data.start_time and update_data.start_time.tzinfo:
                original_pattern_start = original_pattern_start.replace(
                    tzinfo=update_data.start_time.tzinfo
                )
            if update_data.end_time and update_data.end_time.tzinfo:
                original_pattern_end = original_pattern_end.replace(
                    tzinfo=update_data.end_time.tzinfo
                )

            new_start = update_data.start_time or original_pattern_start
            new_end = update_data.end_time or original_pattern_end

            # Calculate the time differences (offsets)
            time_offset_start = new_start - original_pattern_start
            time_offset_end = new_end - original_pattern_end
        else:
            original_pattern_start = original_meeting.start_time
            original_pattern_end = original_meeting.end_time

            new_start = update_data.start_time or original_pattern_start
            new_end = update_data.end_time or original_pattern_end

            # Calculate the time differences (offsets)
            time_offset_start = new_start - original_pattern_start
            time_offset_end = new_end - original_pattern_end

        # Update each meeting
        updated_meetings = []

        for _i, meeting in enumerate(meetings_to_update):

            # Check if this meeting matches the original pattern (only update if it does)
            should_update = True
            if recurrence and (
                update_data.start_time is not None or update_data.end_time is not None
            ):

                # Convert meeting time to the same date as pattern for comparison
                meeting_date = meeting.start_time.date()
                from datetime import time

                # Use the original recurrence times (before updating the pattern)
                recurrence_start_time = time.fromisoformat(recurrence.start_time)
                recurrence_end_time = time.fromisoformat(recurrence.end_time)

                # Create datetime objects for the original pattern times on this meeting's date
                pattern_start = datetime.combine(meeting_date, recurrence_start_time)
                pattern_end = datetime.combine(meeting_date, recurrence_end_time)

                # Make sure the pattern times have the same timezone as the meeting
                if meeting.start_time.tzinfo:
                    pattern_start = pattern_start.replace(
                        tzinfo=meeting.start_time.tzinfo
                    )
                if meeting.end_time.tzinfo:
                    pattern_end = pattern_end.replace(tzinfo=meeting.end_time.tzinfo)

                # Check if this meeting matches the original pattern
                start_diff = abs((meeting.start_time - pattern_start).total_seconds())
                end_diff = abs((meeting.end_time - pattern_end).total_seconds())

                # Only update if meeting matches the original pattern (within 1 minute)
                should_update = start_diff < 60 and end_diff < 60

            if not should_update:
                continue

            # Create a new update request for this specific meeting
            meeting_update = MeetingUpdateRequest(
                service_id=update_data.service_id,
                client_id=update_data.client_id,
                title=update_data.title,
                price_per_hour=update_data.price_per_hour,
                status=update_data.status,
                paid=update_data.paid,
                update_scope=None,  # Single meeting update
            )

            # Handle time fields with offsets
            if time_offset_start is not None and time_offset_end is not None:
                if meeting.id == original_meeting.id:
                    # This is the meeting being edited - apply the new times directly
                    meeting_update.start_time = new_start
                    meeting_update.end_time = new_end
                else:
                    # For other meetings in the recurrence, apply the same offset
                    # This preserves the relative spacing between meetings
                    meeting_update.start_time = meeting.start_time + time_offset_start
                    meeting_update.end_time = meeting.end_time + time_offset_end
            else:
                # No time changes, use original values
                meeting_update.start_time = update_data.start_time
                meeting_update.end_time = update_data.end_time

            # Update the meeting
            try:
                updated_meeting = await self.meeting_service.update_meeting(
                    user_id, meeting.id, meeting_update
                )
                updated_meetings.append(updated_meeting)
            except Exception:
                raise

        return updated_meetings

    async def _update_recurrence_pattern(
        self,
        user_id: UUID,
        recurrence_id: UUID,
        update_data: "MeetingUpdateRequest",
    ) -> RecurrenceResponse:
        """Update the recurrence pattern (start_time, end_time) based on the edited meeting."""

        recurrence = await self.get_recurrence(user_id, recurrence_id)
        if not recurrence:
            raise ValueError("Recurrence not found")

        update_fields = {}
        if update_data.start_time is not None:
            # Convert datetime to HH:mm format
            start_time_str = update_data.start_time.strftime("%H:%M")
            update_fields["start_time"] = start_time_str

        if update_data.end_time is not None:
            # Convert datetime to HH:mm format
            end_time_str = update_data.end_time.strftime("%H:%M")
            update_fields["end_time"] = end_time_str

        if update_fields:
            updated_recurrence = await self.storage.update(
                user_id, recurrence_id, update_fields
            )
            if not updated_recurrence:
                raise ValueError("Failed to update recurrence pattern")
            return updated_recurrence
        else:
            return recurrence

    async def delete_recurring_meeting(
        self,
        user_id: UUID,
        meeting_id: UUID,
        delete_scope: RecurrenceUpdateScope,
    ) -> None:
        """Delete a recurring meeting based on the specified scope"""
        # Get the meeting to delete
        meeting = await self.meeting_service.get_meeting(user_id, meeting_id)
        if not meeting:
            raise ValueError("Meeting not found")

        # Check if this is a recurring meeting
        if not meeting.recurrence_id:
            # Single meeting deletion
            await self.meeting_service.delete_meeting(user_id, meeting_id)
            return

        # Handle recurring meeting deletions
        if delete_scope == RecurrenceUpdateScope.THIS_MEETING_ONLY.value:
            # Delete only this meeting
            await self.meeting_service.delete_meeting(user_id, meeting_id)

        elif delete_scope == RecurrenceUpdateScope.THIS_AND_FUTURE.value:
            # Delete this meeting and all future meetings
            await self._delete_recurring_meetings_with_scope(user_id, meeting, "future")

        elif delete_scope == RecurrenceUpdateScope.ALL_MEETINGS.value:
            # Delete all meetings in the recurrence
            await self._delete_recurring_meetings_with_scope(user_id, meeting, "all")

        else:
            # Default to single meeting deletion
            await self.meeting_service.delete_meeting(user_id, meeting_id)

    async def _delete_recurring_meetings_with_scope(
        self,
        user_id: UUID,
        original_meeting: "MeetingResponse",
        scope: str,
    ) -> None:
        """Delete recurring meetings with the specified scope"""
        # Get all meetings in the recurrence
        all_meetings = await self.meeting_service.get_recurring_meetings(
            user_id, original_meeting.recurrence_id
        )

        # Filter meetings based on scope
        if scope == "future":
            meetings_to_delete = [
                m for m in all_meetings if m.start_time >= original_meeting.start_time
            ]
        else:  # scope == "all"
            meetings_to_delete = all_meetings

        # Delete each meeting
        for meeting in meetings_to_delete:
            await self.meeting_service.delete_meeting(user_id, meeting.id)

    async def create_recurrence_exception(
        self,
        user_id: UUID,
        recurrence_id: UUID,
        meeting_id: UUID,
        original_start_time: datetime,
        modified_start_time: datetime,
        modified_end_time: datetime,
        modified_title: str | None = None,
        modified_price_per_hour: float | None = None,
    ) -> RecurrenceException:
        """Create an exception for a specific meeting in a recurrence"""
        try:
            # For now, we'll store the exception data in the meeting record itself
            # In a production system, you would have a separate recurrence_exceptions table

            # First, verify the meeting exists and belongs to the recurrence
            meeting = await self.meeting_service.get_meeting(user_id, meeting_id)
            if not meeting:
                raise ValueError("Meeting not found")

            if meeting.recurrence_id != str(recurrence_id):
                raise ValueError("Meeting does not belong to the specified recurrence")

            # Update the meeting with the exception data
            exception_data = {
                "start_time": ensure_utc(modified_start_time),
                "end_time": ensure_utc(modified_end_time),
            }

            if modified_title:
                exception_data["title"] = modified_title
            if modified_price_per_hour:
                exception_data["price_per_hour"] = modified_price_per_hour
                # Recalculate price_total
                duration_hours = (
                    modified_end_time - modified_start_time
                ).total_seconds() / 3600
                exception_data["price_total"] = duration_hours * modified_price_per_hour

            # Add metadata to track this as an exception
            exception_data["is_recurrence_exception"] = True
            exception_data["original_start_time"] = ensure_utc(original_start_time)

            # Update the meeting using MeetingService
            from app.api.meetings.model import MeetingUpdateRequest

            update_request = MeetingUpdateRequest(**exception_data)
            updated_meeting = await self.meeting_service.update_meeting(
                user_id, meeting_id, update_request
            )

            if not updated_meeting:
                raise ValueError("Failed to update meeting with exception data")

            # Create and return the exception object
            exception = RecurrenceException(
                recurrence_id=recurrence_id,
                meeting_id=meeting_id,
                original_start_time=original_start_time,
                modified_start_time=modified_start_time,
                modified_end_time=modified_end_time,
                modified_title=modified_title,
                modified_price_per_hour=modified_price_per_hour,
                created_at=datetime.now(),
            )

            return exception

        except Exception as e:
            print(
                f"Failed to create recurrence exception for meeting {meeting_id}: {e}"
            )
            raise

    async def recurrence_exists(self, user_id: UUID, recurrence_id: UUID) -> bool:
        """Check if a recurrence exists"""
        return await self.storage.exists(user_id, recurrence_id)
