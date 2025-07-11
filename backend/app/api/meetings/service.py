from datetime import date, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingStatus,
    MeetingUpdateRequest,
)
from app.api.shared import RecurrenceUpdateScope
from app.models import Meeting as MeetingModel


class MeetingService:
    def __init__(self, db: Session):
        self.db = db

    async def get_meetings(
        self,
        user_id: UUID,
        status: str | None = None,
        date_filter: date | None = None,
    ) -> list[MeetingResponse]:
        """Get meetings for a user, optionally filtered by status (string) and date"""
        query = self.db.query(MeetingModel).filter(MeetingModel.user_id == str(user_id))

        # Filter by date if provided
        if date_filter:
            query = query.filter(
                and_(
                    MeetingModel.start_time
                    >= datetime.combine(date_filter, datetime.min.time()),
                    MeetingModel.start_time
                    < datetime.combine(
                        date_filter + timedelta(days=1), datetime.min.time()
                    ),
                )
            )

        # Filter by status if provided
        if status:
            query = query.filter(MeetingModel.status == status)

        meetings = query.all()
        return [self._to_response(meeting) for meeting in meetings]

    async def create_meeting(
        self, user_id: UUID, meeting: MeetingCreateRequest
    ) -> MeetingResponse:
        """Create a new meeting"""
        duration_hours = (meeting.end_time - meeting.start_time).total_seconds() / 3600
        price_total = duration_hours * meeting.price_per_hour

        db_meeting = MeetingModel(
            id=str(uuid4()),
            user_id=str(user_id),
            service_id=str(meeting.service_id),
            client_id=str(meeting.client_id),
            title=meeting.title,
            recurrence_id=str(meeting.recurrence_id) if meeting.recurrence_id else None,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            price_per_hour=meeting.price_per_hour,
            price_total=price_total,
            status=(
                meeting.status
                if isinstance(meeting.status, str)
                else meeting.status.value
            ),
            paid=meeting.paid,
        )

        self.db.add(db_meeting)
        self.db.commit()
        self.db.refresh(db_meeting)

        return self._to_response(db_meeting)

    async def update_meeting(
        self, user_id: UUID, meeting_id: UUID, meeting: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update an existing meeting with recurrence support"""
        # Find the meeting to update
        db_meeting = (
            self.db.query(MeetingModel)
            .filter(
                and_(
                    MeetingModel.id == str(meeting_id),
                    MeetingModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_meeting:
            raise ValueError("Meeting not found")

        # Check if this is a recurring meeting
        if db_meeting.recurrence_id and meeting.update_scope:
            # Handle recurring meeting update based on scope
            return await self._update_recurring_meeting(user_id, db_meeting, meeting)
        else:
            # Regular meeting update
            return await self._update_single_meeting(db_meeting, meeting)

    async def _update_single_meeting(
        self, meeting: MeetingModel, update_data: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update a single meeting"""
        if update_data.service_id is not None:
            meeting.service_id = str(update_data.service_id)
        if update_data.client_id is not None:
            meeting.client_id = str(update_data.client_id)
        if update_data.title is not None:
            meeting.title = update_data.title
        if update_data.start_time is not None:
            meeting.start_time = update_data.start_time
        if update_data.end_time is not None:
            meeting.end_time = update_data.end_time
        if update_data.price_per_hour is not None:
            meeting.price_per_hour = update_data.price_per_hour
        if update_data.status is not None:
            meeting.status = (
                update_data.status
                if isinstance(update_data.status, str)
                else update_data.status.value
            )
        if update_data.paid is not None:
            meeting.paid = update_data.paid

        # Recalculate price_total if time or price changed
        if (
            update_data.start_time is not None
            or update_data.end_time is not None
            or update_data.price_per_hour is not None
        ):
            duration_hours = (
                meeting.end_time - meeting.start_time
            ).total_seconds() / 3600
            meeting.price_total = duration_hours * meeting.price_per_hour

        self.db.commit()
        self.db.refresh(meeting)
        return self._to_response(meeting)

    async def _update_recurring_meeting(
        self, user_id: UUID, meeting: MeetingModel, update_data: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update a recurring meeting based on the specified scope"""
        # Validate update_scope
        if update_data.update_scope and update_data.update_scope not in [
            scope.value for scope in RecurrenceUpdateScope
        ]:
            raise ValueError(f"Invalid update_scope: {update_data.update_scope}")

        if update_data.update_scope == RecurrenceUpdateScope.THIS_MEETING_ONLY.value:
            # Update only this meeting
            return await self._update_single_meeting(meeting, update_data)

        elif update_data.update_scope == RecurrenceUpdateScope.THIS_AND_FUTURE.value:
            # Update this meeting and all future meetings in the recurrence
            # Update this meeting
            updated_meeting = await self._update_single_meeting(meeting, update_data)

            # Find and update all future meetings in the same recurrence
            future_meetings = (
                self.db.query(MeetingModel)
                .filter(
                    and_(
                        MeetingModel.recurrence_id == meeting.recurrence_id,
                        MeetingModel.start_time > meeting.start_time,
                        MeetingModel.status == MeetingStatus.UPCOMING.value,
                    )
                )
                .all()
            )

            for future_meeting in future_meetings:
                await self._update_single_meeting(future_meeting, update_data)

            return updated_meeting

        elif update_data.update_scope == RecurrenceUpdateScope.ALL_MEETINGS.value:
            # Update all meetings in the recurrence (including past ones)
            all_meetings = (
                self.db.query(MeetingModel)
                .filter(MeetingModel.recurrence_id == meeting.recurrence_id)
                .all()
            )

            for all_meeting in all_meetings:
                await self._update_single_meeting(all_meeting, update_data)

            return await self._update_single_meeting(meeting, update_data)

        else:
            # Default to single meeting update
            return await self._update_single_meeting(meeting, update_data)

    async def delete_meeting(self, user_id: UUID, meeting_id: UUID) -> bool:
        """Delete a meeting"""
        meeting = (
            self.db.query(MeetingModel)
            .filter(
                and_(
                    MeetingModel.id == str(meeting_id),
                    MeetingModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if meeting:
            self.db.delete(meeting)
            self.db.commit()
            return True
        return False

    async def get_recurring_meetings(
        self, user_id: UUID, recurrence_id: UUID
    ) -> list[MeetingResponse]:
        """Get all meetings for a specific recurrence"""
        meetings = (
            self.db.query(MeetingModel)
            .filter(
                and_(
                    MeetingModel.recurrence_id == str(recurrence_id),
                    MeetingModel.user_id == str(user_id),
                )
            )
            .all()
        )

        return [self._to_response(meeting) for meeting in meetings]

    def _to_response(self, meeting: MeetingModel) -> MeetingResponse:
        """Convert database model to response model"""
        return MeetingResponse(
            id=UUID(meeting.id),
            user_id=UUID(meeting.user_id),
            service_id=UUID(meeting.service_id),
            client_id=UUID(meeting.client_id),
            title=meeting.title,
            recurrence_id=(
                UUID(meeting.recurrence_id) if meeting.recurrence_id else None
            ),
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            price_per_hour=meeting.price_per_hour,
            price_total=meeting.price_total,
            status=MeetingStatus(meeting.status),
            paid=meeting.paid,
            created_at=meeting.created_at,
        )
