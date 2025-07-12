from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.commons.shared import RecurrenceUpdateScope
from app.api.meetings.model import MeetingCreateRequest, MeetingResponse, MeetingStatus
from app.api.meetings.service import MeetingService
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


class RecurrenceService:
    def __init__(self, db: Session):
        self.db = db
        self.meeting_service = MeetingService(db)

    def _generate_meeting_instances(
        self, recurrence: RecurrenceResponse, start_date: datetime, end_date: datetime
    ) -> list[MeetingCreateRequest]:
        """Generate meeting instances for a recurrence pattern"""
        instances = []
        current_date = start_date

        while current_date <= end_date:
            # Create meeting instance using the time conversion methods
            start_datetime = datetime.combine(
                current_date.date(), recurrence.get_start_time()
            )
            end_datetime = datetime.combine(
                current_date.date(), recurrence.get_end_time()
            )

            instance = MeetingCreateRequest(
                service_id=recurrence.service_id,
                client_id=recurrence.client_id,
                title=recurrence.title,
                recurrence_id=recurrence.id,
                start_time=start_datetime,
                end_time=end_datetime,
                price_per_hour=recurrence.price_per_hour,
                status=MeetingStatus.upcoming,
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

    async def create_recurrence(
        self, user_id: UUID, recurrence: RecurrenceCreateRequest
    ) -> RecurrenceResponse:
        """Create a new recurrence and generate future meetings"""
        db_recurrence = RecurrenceModel(
            id=str(uuid4()),
            user_id=str(user_id),
            service_id=str(recurrence.service_id),
            client_id=str(recurrence.client_id),
            frequency=recurrence.frequency.value,
            start_date=recurrence.start_date,
            end_date=recurrence.end_date,
            title=recurrence.title,
            start_time=recurrence.start_time,
            end_time=recurrence.end_time,
            price_per_hour=recurrence.price_per_hour,
        )

        self.db.add(db_recurrence)
        self.db.commit()
        self.db.refresh(db_recurrence)

        # Convert to response model for meeting generation
        recurrence_response = self._to_response(db_recurrence)

        # Generate meeting instances
        instances = self._generate_meeting_instances(
            recurrence_response, recurrence.start_date, recurrence.end_date
        )

        # Create all the meeting instances
        created_meetings = []
        for instance in instances:
            meeting = await self.meeting_service.create_meeting(user_id, instance)
            created_meetings.append(meeting)

        return recurrence_response

    async def update_recurrence(
        self, user_id: UUID, recurrence_id: UUID, recurrence: RecurrenceUpdateRequest
    ) -> RecurrenceResponse:
        """Update a recurrence and apply changes to all future meetings"""
        db_recurrence = (
            self.db.query(RecurrenceModel)
            .filter(
                and_(
                    RecurrenceModel.id == str(recurrence_id),
                    RecurrenceModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_recurrence:
            raise ValueError("Recurrence not found")

        # Update recurrence fields
        if recurrence.service_id is not None:
            db_recurrence.service_id = str(recurrence.service_id)
        if recurrence.client_id is not None:
            db_recurrence.client_id = str(recurrence.client_id)
        if recurrence.frequency is not None:
            db_recurrence.frequency = recurrence.frequency.value
        if recurrence.start_date is not None:
            db_recurrence.start_date = recurrence.start_date
        if recurrence.end_date is not None:
            db_recurrence.end_date = recurrence.end_date

        self.db.commit()
        self.db.refresh(db_recurrence)

        return self._to_response(db_recurrence)

    async def delete_recurrence(self, user_id: UUID, recurrence_id: UUID) -> bool:
        """Delete a recurrence and all associated future meetings"""
        db_recurrence = (
            self.db.query(RecurrenceModel)
            .filter(
                and_(
                    RecurrenceModel.id == str(recurrence_id),
                    RecurrenceModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if db_recurrence:
            # Delete all associated meetings
            meetings = (
                self.db.query(MeetingModel)
                .filter(MeetingModel.recurrence_id == str(recurrence_id))
                .all()
            )

            for meeting in meetings:
                self.db.delete(meeting)

            # Delete the recurrence
            self.db.delete(db_recurrence)
            self.db.commit()
            return True
        return False

    async def get_recurrence_meetings(
        self, user_id: UUID, recurrence_id: UUID
    ) -> list[MeetingResponse]:
        """Get all meetings for a specific recurrence"""
        return await self.meeting_service.get_recurring_meetings(user_id, recurrence_id)

    async def update_recurring_meeting(
        self,
        user_id: UUID,
        meeting_id: UUID,
        update_data: dict,
        update_scope: RecurrenceUpdateScope,
    ) -> list[MeetingResponse]:
        """Update a recurring meeting based on the specified scope"""
        # This would be implemented with actual database queries
        # For now, return empty list
        return []

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
        # This would be implemented with a separate exceptions table
        # For now, return a mock exception
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

    def _to_response(self, recurrence: RecurrenceModel) -> RecurrenceResponse:
        """Convert database model to response model"""
        return RecurrenceResponse(
            id=UUID(recurrence.id),
            user_id=UUID(recurrence.user_id),
            service_id=UUID(recurrence.service_id),
            client_id=UUID(recurrence.client_id),
            frequency=recurrence.frequency,
            start_date=recurrence.start_date,
            end_date=recurrence.end_date,
            title=recurrence.title,
            start_time=recurrence.start_time,
            end_time=recurrence.end_time,
            price_per_hour=recurrence.price_per_hour,
            created_at=recurrence.created_at,
        )
