import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.api.commons.shared import RecurrenceUpdateScope, ensure_utc
from app.api.meetings.model import MeetingCreateRequest, MeetingResponse, MeetingStatus
from app.api.recurrences.model import (
    RecurrenceCreateRequest,
    RecurrenceException,
    RecurrenceFrequency,
    RecurrenceResponse,
    RecurrenceUpdateRequest,
)
from app.models import (
    Meeting as MeetingModel,
)
from app.models import (
    Recurrence as RecurrenceModel,
)
from app.storage.factory import StorageFactory

logger = logging.getLogger(__name__)


class RecurrenceService:
    def __init__(self):
        self.storage = StorageFactory.create_storage_service(
            model_class=RecurrenceModel,
            response_class=RecurrenceResponse,
            table_name="recurrences",
        )
        # Create separate storage for meetings (needed for business logic)
        self.meeting_storage = StorageFactory.create_storage_service(
            model_class=MeetingModel,
            response_class=None,  # We'll handle responses manually
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

    async def create_recurrence(
        self, user_id: UUID, recurrence: RecurrenceCreateRequest
    ) -> RecurrenceResponse:
        """Create a new recurrence and generate future meetings"""
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
        instances = self._generate_meeting_instances(
            created_recurrence,
            created_recurrence.start_date,
            created_recurrence.end_date,
        )

        # Create all the meeting instances
        created_meetings = []
        for instance in instances:
            # Create meeting using the meeting storage directly
            meeting_data = {
                "id": str(uuid4()),
                "service_id": str(instance.service_id),
                "client_id": str(instance.client_id),
                "title": instance.title,
                "recurrence_id": str(instance.recurrence_id),
                "start_time": ensure_utc(instance.start_time),
                "end_time": ensure_utc(instance.end_time),
                "price_per_hour": instance.price_per_hour,
                "price_total": (instance.end_time - instance.start_time).total_seconds()
                / 3600
                * instance.price_per_hour,
                "status": (
                    instance.status.value
                    if hasattr(instance.status, "value")
                    else instance.status
                ),
                "paid": instance.paid,
            }

            created_meeting = await self.meeting_storage.create(user_id, meeting_data)
            created_meetings.append(created_meeting)

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
        meetings = await self.meeting_storage.get_all(
            user_id, {"recurrence_id": str(recurrence_id)}
        )

        for meeting in meetings:
            await self.meeting_storage.delete(user_id, meeting["id"])

        # Delete the recurrence
        success = await self.storage.delete(user_id, recurrence_id)
        return success

    async def get_recurrence_meetings(
        self, user_id: UUID, recurrence_id: UUID
    ) -> list[MeetingResponse]:
        """Get all meetings for a specific recurrence"""
        return await self.meeting_storage.get_all(
            user_id, {"recurrence_id": str(recurrence_id)}
        )

    async def update_recurring_meeting(
        self,
        user_id: UUID,
        meeting_id: UUID,
        update_data: dict,
        update_scope: RecurrenceUpdateScope,
    ) -> list[MeetingResponse]:
        """Update a recurring meeting based on the specified scope"""
        try:
            # Get the meeting to find its recurrence_id
            meeting = await self.meeting_storage.get_by_id(user_id, meeting_id)
            if not meeting:
                raise ValueError("Meeting not found")

            recurrence_id = meeting.get("recurrence_id")
            if not recurrence_id:
                raise ValueError("Meeting is not part of a recurrence")

            updated_meetings = []

            if update_scope == RecurrenceUpdateScope.THIS_MEETING_ONLY:
                # Update only this specific meeting
                updated_meeting = await self.meeting_storage.update(
                    user_id, meeting_id, update_data
                )
                if updated_meeting:
                    updated_meetings.append(updated_meeting)

            elif update_scope == RecurrenceUpdateScope.THIS_AND_FUTURE:
                # Update this meeting and all future meetings in the recurrence
                # First update this meeting
                updated_meeting = await self.meeting_storage.update(
                    user_id, meeting_id, update_data
                )
                if updated_meeting:
                    updated_meetings.append(updated_meeting)

                # Get all future meetings in the same recurrence
                future_meetings = await self.meeting_storage.get_all(
                    user_id,
                    {
                        "recurrence_id": str(recurrence_id),
                        "status": MeetingStatus.UPCOMING.value,
                    },
                )

                # Filter for meetings after the current one
                future_meetings = [
                    m
                    for m in future_meetings
                    if m["start_time"] > meeting["start_time"]
                ]

                # Update each future meeting
                for future_meeting in future_meetings:
                    updated_future_meeting = await self.meeting_storage.update(
                        user_id, future_meeting["id"], update_data
                    )
                    if updated_future_meeting:
                        updated_meetings.append(updated_future_meeting)

            elif update_scope == RecurrenceUpdateScope.ALL_MEETINGS:
                # Update all meetings in the recurrence (including past ones)
                all_meetings = await self.meeting_storage.get_all(
                    user_id, {"recurrence_id": str(recurrence_id)}
                )

                # Update each meeting
                for meeting_to_update in all_meetings:
                    updated_meeting = await self.meeting_storage.update(
                        user_id, meeting_to_update["id"], update_data
                    )
                    if updated_meeting:
                        updated_meetings.append(updated_meeting)

            logger.info(
                f"Updated {len(updated_meetings)} meetings for recurrence {recurrence_id} with scope {update_scope.value}"
            )
            return updated_meetings

        except Exception as e:
            logger.error(f"Failed to update recurring meeting {meeting_id}: {e}")
            raise

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
            meeting = await self.meeting_storage.get_by_id(user_id, meeting_id)
            if not meeting:
                raise ValueError("Meeting not found")

            if meeting.get("recurrence_id") != str(recurrence_id):
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

            # Update the meeting
            updated_meeting = await self.meeting_storage.update(
                user_id, meeting_id, exception_data
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

            logger.info(
                f"Created recurrence exception for meeting {meeting_id} in recurrence {recurrence_id}"
            )
            return exception

        except Exception as e:
            logger.error(
                f"Failed to create recurrence exception for meeting {meeting_id}: {e}"
            )
            raise

    async def recurrence_exists(self, user_id: UUID, recurrence_id: UUID) -> bool:
        """Check if a recurrence exists"""
        return await self.storage.exists(user_id, recurrence_id)
