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
        # Order by creation date (newest first)
        meetings = await self.storage.get_all(user_id, filters, order_by="start_time")

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
        # Validate membership availability if membership is selected
        if meeting.membership_id:
            from app.api.memberships.service import MembershipService

            membership_service = MembershipService()
            is_available = await membership_service.check_membership_availability(
                user_id, meeting.membership_id
            )
            if not is_available:
                raise ValueError(
                    "Selected membership has no available spots for new meetings"
                )

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
                start_time = update_data.start_time or current_meeting.start_time
                end_time = update_data.end_time or current_meeting.end_time
                price_per_hour = (
                    update_data.price_per_hour or current_meeting.price_per_hour
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

        # Calculate time offsets if time fields are being updated
        time_offset_start = None
        time_offset_end = None

        if update_data.start_time is not None or update_data.end_time is not None:
            # Get the recurrence to find the original times
            from app.api.recurrences.service import RecurrenceService

            recurrence_service = RecurrenceService()
            recurrence = await recurrence_service.get_recurrence(
                user_id, meeting.recurrence_id
            )

            if recurrence:
                # Convert recurrence time strings to datetime for comparison
                # Use the meeting's date with the recurrence's time
                meeting_date = meeting.start_time.date()
                from datetime import time

                # Parse recurrence times
                recurrence_start_time = time.fromisoformat(recurrence.start_time)
                recurrence_end_time = time.fromisoformat(recurrence.end_time)

                # Create datetime objects using meeting date and recurrence times
                original_start = datetime.combine(meeting_date, recurrence_start_time)
                original_end = datetime.combine(meeting_date, recurrence_end_time)

                # Make sure the pattern times have the same timezone as the update data
                if update_data.start_time and update_data.start_time.tzinfo:
                    original_start = original_start.replace(
                        tzinfo=update_data.start_time.tzinfo
                    )
                if update_data.end_time and update_data.end_time.tzinfo:
                    original_end = original_end.replace(
                        tzinfo=update_data.end_time.tzinfo
                    )

                new_start = update_data.start_time or original_start
                new_end = update_data.end_time or original_end

                # Calculate the time differences (offsets)
                time_offset_start = new_start - original_start
                time_offset_end = new_end - original_end
            else:
                # Fallback to current meeting times if recurrence not found
                original_start = meeting.start_time
                original_end = meeting.end_time

                new_start = update_data.start_time or original_start
                new_end = update_data.end_time or original_end

                # Calculate the time differences (offsets)
                time_offset_start = new_start - original_start
                time_offset_end = new_end - original_end

        if update_data.update_scope == RecurrenceUpdateScope.THIS_MEETING_ONLY.value:
            # Update only this meeting
            return await self._update_single_meeting(user_id, meeting.id, update_data)

        elif update_data.update_scope == RecurrenceUpdateScope.THIS_AND_FUTURE.value:
            # Update this meeting and all future meetings in the recurrence
            # Update this meeting
            updated_meeting = await self._update_single_meeting(
                user_id, meeting.id, update_data
            )

            # Get the original recurrence times to identify which meetings to update
            from app.api.recurrences.service import RecurrenceService

            recurrence_service = RecurrenceService()
            recurrence = await recurrence_service.get_recurrence(
                user_id, meeting.recurrence_id
            )

            if recurrence:
                # Convert recurrence times to datetime for comparison
                meeting_date = meeting.start_time.date()
                from datetime import time

                recurrence_start_time = time.fromisoformat(recurrence.start_time)
                recurrence_end_time = time.fromisoformat(recurrence.end_time)

                # Create datetime objects for the original pattern times
                original_pattern_start = datetime.combine(
                    meeting_date, recurrence_start_time
                )
                original_pattern_end = datetime.combine(
                    meeting_date, recurrence_end_time
                )

                # Find and update all future meetings in the same recurrence
                future_meetings = await self.storage.get_all(
                    user_id,
                    {
                        "recurrence_id": str(meeting.recurrence_id),
                        "status": MeetingStatus.UPCOMING.value,
                    },
                )

                # Filter for meetings after the current one AND that match the original pattern
                future_meetings = [
                    m
                    for m in future_meetings
                    if m.start_time > meeting.start_time
                    and abs((m.start_time - original_pattern_start).total_seconds())
                    < 60  # Within 1 minute
                    and abs((m.end_time - original_pattern_end).total_seconds())
                    < 60  # Within 1 minute
                ]

                for _i, future_meeting in enumerate(future_meetings):
                    # Create update data with time offsets applied
                    future_update_data = MeetingUpdateRequest(
                        service_id=update_data.service_id,
                        client_id=update_data.client_id,
                        title=update_data.title,
                        recurrence_id=update_data.recurrence_id,
                        membership_id=update_data.membership_id,
                        price_per_hour=update_data.price_per_hour,
                        status=update_data.status,
                        paid=update_data.paid,
                        update_scope=None,  # Single meeting update
                    )

                    # Apply time offsets if available
                    if time_offset_start is not None and time_offset_end is not None:
                        future_update_data.start_time = (
                            future_meeting.start_time + time_offset_start
                        )
                        future_update_data.end_time = (
                            future_meeting.end_time + time_offset_end
                        )
                    else:
                        # No time changes, use original values
                        future_update_data.start_time = update_data.start_time
                        future_update_data.end_time = update_data.end_time

                    await self._update_single_meeting(
                        user_id, future_meeting.id, future_update_data
                    )

            return updated_meeting

        elif update_data.update_scope == RecurrenceUpdateScope.ALL_MEETINGS.value:
            # Update all meetings in the recurrence (including past ones)
            # Get the original recurrence times to identify which meetings to update
            from app.api.recurrences.service import RecurrenceService

            recurrence_service = RecurrenceService()
            recurrence = await recurrence_service.get_recurrence(
                user_id, meeting.recurrence_id
            )

            if recurrence:
                # Convert recurrence times to datetime for comparison
                meeting_date = meeting.start_time.date()
                from datetime import time

                recurrence_start_time = time.fromisoformat(recurrence.start_time)
                recurrence_end_time = time.fromisoformat(recurrence.end_time)

                # Create datetime objects for the original pattern times
                original_pattern_start = datetime.combine(
                    meeting_date, recurrence_start_time
                )
                original_pattern_end = datetime.combine(
                    meeting_date, recurrence_end_time
                )

                all_meetings = await self.storage.get_all(
                    user_id, {"recurrence_id": str(meeting.recurrence_id)}
                )

                # Filter for meetings that match the original pattern
                all_meetings = [
                    m
                    for m in all_meetings
                    if abs((m.start_time - original_pattern_start).total_seconds())
                    < 60  # Within 1 minute
                    and abs((m.end_time - original_pattern_end).total_seconds())
                    < 60  # Within 1 minute
                ]

                for _i, all_meeting in enumerate(all_meetings):
                    # Create update data with time offsets applied
                    all_update_data = MeetingUpdateRequest(
                        service_id=update_data.service_id,
                        client_id=update_data.client_id,
                        title=update_data.title,
                        recurrence_id=update_data.recurrence_id,
                        membership_id=update_data.membership_id,
                        price_per_hour=update_data.price_per_hour,
                        status=update_data.status,
                        paid=update_data.paid,
                        update_scope=None,  # Single meeting update
                    )

                    # Apply time offsets if available
                    if time_offset_start is not None and time_offset_end is not None:
                        all_update_data.start_time = (
                            all_meeting.start_time + time_offset_start
                        )
                        all_update_data.end_time = (
                            all_meeting.end_time + time_offset_end
                        )
                    else:
                        # No time changes, use original values
                        all_update_data.start_time = update_data.start_time
                        all_update_data.end_time = update_data.end_time

                    await self._update_single_meeting(
                        user_id, all_meeting.id, all_update_data
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
                m for m in future_meetings if m.start_time > meeting.start_time
            ]

            for future_meeting in future_meetings:
                await scheduler_service.cancel_meeting_status_update(future_meeting.id)
                await self.storage.delete(user_id, future_meeting.id)

            return True

        elif delete_scope == "all_meetings":
            # Delete all meetings in the recurrence (including past ones)
            all_meetings = await self.storage.get_all(
                user_id, {"recurrence_id": str(meeting.recurrence_id)}
            )

            for all_meeting in all_meetings:
                await scheduler_service.cancel_meeting_status_update(all_meeting.id)
                await self.storage.delete(user_id, all_meeting.id)

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
                        user_id, membership_id, {"start_date": start_date}
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

    async def ensure_scheduled_jobs_for_existing_meetings(self) -> dict:
        """Ensure all existing upcoming meetings have scheduled status update jobs.

        Returns:
            dict: Summary of the operation with counts and any errors
        """
        try:
            logger.info(
                "Starting scheduled jobs check for existing upcoming meetings..."
            )

            # Get all upcoming meetings from all users
            upcoming_meetings = await self._get_all_upcoming_meetings()

            if not upcoming_meetings:
                logger.info("No upcoming meetings found, no jobs to schedule")
                return {
                    "total_meetings": 0,
                    "jobs_scheduled": 0,
                    "jobs_already_exist": 0,
                    "meetings_skipped": 0,
                    "errors": [],
                    "success": True,
                }

            logger.info(f"Found {len(upcoming_meetings)} upcoming meetings to check")

            # Single loop to handle filtering and job scheduling
            from datetime import UTC, datetime

            current_time = datetime.now(UTC)

            jobs_scheduled = 0
            jobs_already_exist = 0
            meetings_skipped = 0
            errors = []

            for meeting in upcoming_meetings:
                # Check if meeting has already ended
                if meeting.end_time <= current_time:
                    meetings_skipped += 1
                    logger.info(
                        f"Skipping meeting {meeting.id} - already ended at {meeting.end_time}"
                    )
                    continue

                try:
                    # Check if job already exists for this meeting
                    job_id = f"meeting_status_update_{meeting.id}"

                    if (
                        scheduler_service.scheduler
                        and scheduler_service.scheduler.get_job(job_id)
                    ):
                        jobs_already_exist += 1
                        logger.debug(f"Job already exists for meeting {meeting.id}")
                    else:
                        # Schedule the job
                        await scheduler_service.schedule_meeting_status_update(
                            meeting.id, meeting.end_time
                        )
                        jobs_scheduled += 1
                        logger.info(
                            f"Scheduled status update job for meeting {meeting.id} at {meeting.end_time}"
                        )

                except Exception as e:
                    error_msg = (
                        f"Failed to schedule job for meeting {meeting.id}: {str(e)}"
                    )
                    logger.error(error_msg)
                    errors.append(error_msg)

            result = {
                "total_meetings": len(upcoming_meetings),
                "jobs_scheduled": jobs_scheduled,
                "jobs_already_exist": jobs_already_exist,
                "meetings_skipped": meetings_skipped,
                "errors": errors,
                "success": len(errors) == 0,
            }

            logger.info(
                f"Scheduled jobs check completed: {jobs_scheduled} new jobs, {jobs_already_exist} already exist, {meetings_skipped} past meetings skipped, {len(errors)} errors"
            )
            return result

        except Exception as e:
            error_msg = (
                f"Failed to ensure scheduled jobs for existing meetings: {str(e)}"
            )
            logger.error(error_msg)
            return {
                "total_meetings": 0,
                "jobs_scheduled": 0,
                "jobs_already_exist": 0,
                "meetings_skipped": 0,
                "errors": [error_msg],
                "success": False,
            }

    async def _get_all_upcoming_meetings(self) -> list[MeetingResponse]:
        """Get all upcoming meetings from all users.

        This method bypasses the user_id filter to get all upcoming meetings
        across all users for the startup job scheduling.
        """
        try:
            # Use direct database access to get all upcoming meetings
            if hasattr(self.storage, "supabase"):
                # Production: Use Supabase
                result = (
                    self.storage.supabase.table("meetings")
                    .select("*")
                    .eq("status", MeetingStatus.UPCOMING.value)
                    .execute()
                )

                meetings = []
                for meeting_data in result.data:
                    # Convert to MeetingResponse format
                    meeting = MeetingResponse(
                        id=UUID(meeting_data["id"]),
                        user_id=UUID(meeting_data["user_id"]),  # Include user_id
                        service_id=UUID(meeting_data["service_id"]),
                        client_id=UUID(meeting_data["client_id"]),
                        title=meeting_data["title"],
                        recurrence_id=(
                            UUID(meeting_data["recurrence_id"])
                            if meeting_data.get("recurrence_id")
                            else None
                        ),
                        membership_id=(
                            UUID(meeting_data["membership_id"])
                            if meeting_data.get("membership_id")
                            else None
                        ),
                        start_time=datetime.fromisoformat(meeting_data["start_time"]),
                        end_time=datetime.fromisoformat(meeting_data["end_time"]),
                        price_per_hour=meeting_data["price_per_hour"],
                        price_total=meeting_data["price_total"],
                        status=meeting_data["status"],
                        paid=meeting_data["paid"],
                        created_at=datetime.fromisoformat(meeting_data["created_at"]),
                        updated_at=(
                            datetime.fromisoformat(meeting_data["updated_at"])
                            if meeting_data.get("updated_at")
                            else None
                        ),
                    )
                    meetings.append(meeting)

            else:
                # Development: Use SQLite
                from sqlalchemy import create_engine
                from sqlalchemy.orm import sessionmaker

                from app.config import settings

                engine = create_engine(f"sqlite:///{settings.database_path}")
                SessionLocal = sessionmaker(
                    autocommit=False, autoflush=False, bind=engine
                )
                db = SessionLocal()

                try:
                    db_meetings = (
                        db.query(MeetingModel)
                        .filter(MeetingModel.status == MeetingStatus.UPCOMING.value)
                        .all()
                    )

                    meetings = []
                    for db_meeting in db_meetings:
                        meeting = MeetingResponse(
                            id=db_meeting.id,
                            user_id=db_meeting.user_id,  # Include user_id
                            service_id=db_meeting.service_id,
                            client_id=db_meeting.client_id,
                            title=db_meeting.title,
                            recurrence_id=db_meeting.recurrence_id,
                            membership_id=db_meeting.membership_id,
                            start_time=db_meeting.start_time,
                            end_time=db_meeting.end_time,
                            price_per_hour=db_meeting.price_per_hour,
                            price_total=db_meeting.price_total,
                            status=db_meeting.status,
                            paid=db_meeting.paid,
                            created_at=db_meeting.created_at,
                            updated_at=db_meeting.updated_at,
                        )
                        meetings.append(meeting)

                finally:
                    db.close()

            return meetings

        except Exception as e:
            logger.error(f"Failed to get all upcoming meetings: {e}")
            return []
