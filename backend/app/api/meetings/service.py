from datetime import date, datetime
from uuid import UUID, uuid4

from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingResponse,
    MeetingStatus,
    MeetingUpdateRequest,
)


class MeetingService:
    def __init__(self):
        # Mock data with today's date
        today = date.today()
        self.mock_meetings = [
            MeetingResponse(
                id=UUID("77777777-7777-7777-7777-777777777777"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("11111111-1111-1111-1111-111111111111"),
                client_id=UUID("44444444-4444-4444-4444-444444444444"),
                title="Consultation-John Doe",
                recurrence_id=None,
                start_time=datetime.combine(
                    today, datetime.min.time().replace(hour=9, minute=0)
                ),
                end_time=datetime.combine(
                    today, datetime.min.time().replace(hour=10, minute=30)
                ),
                price_per_hour=80.0,
                price_total=120.0,
                status=MeetingStatus.DONE,
                paid=True,
                created_at=datetime(2024, 3, 1, 10, 0, 0),
            ),
            MeetingResponse(
                id=UUID("88888888-8888-8888-8888-888888888888"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("22222222-2222-2222-2222-222222222222"),
                client_id=UUID("55555555-5555-5555-5555-555555555555"),
                title="Design-Jane Smith",
                recurrence_id=None,
                start_time=datetime.combine(
                    today, datetime.min.time().replace(hour=14, minute=0)
                ),
                end_time=datetime.combine(
                    today, datetime.min.time().replace(hour=15, minute=0)
                ),
                price_per_hour=60.0,
                price_total=60.0,
                status=MeetingStatus.UPCOMING,
                paid=False,
                created_at=datetime(2024, 3, 5, 9, 0, 0),
            ),
            MeetingResponse(
                id=UUID("99999999-9999-9999-9999-999999999999"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("33333333-3333-3333-3333-333333333333"),
                client_id=UUID("66666666-6666-6666-6666-666666666666"),
                title="Development-Mike Johnson",
                recurrence_id=None,
                start_time=datetime.combine(
                    today, datetime.min.time().replace(hour=16, minute=30)
                ),
                end_time=datetime.combine(
                    today, datetime.min.time().replace(hour=18, minute=0)
                ),
                price_per_hour=110.0,
                price_total=165.0,
                status=MeetingStatus.UPCOMING,
                paid=False,
                created_at=datetime(2024, 3, 8, 14, 0, 0),
            ),
            MeetingResponse(
                id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("11111111-1111-1111-1111-111111111111"),
                client_id=UUID("44444444-4444-4444-4444-444444444444"),
                title="Consultation-John Doe",
                recurrence_id=None,
                start_time=datetime.combine(
                    today, datetime.min.time().replace(hour=11, minute=0)
                ),
                end_time=datetime.combine(
                    today, datetime.min.time().replace(hour=12, minute=0)
                ),
                price_per_hour=80.0,
                price_total=80.0,
                status=MeetingStatus.CANCELED,
                paid=False,
                created_at=datetime(2024, 3, 1, 10, 0, 0),
            ),
        ]

    async def get_meetings(
        self,
        user_id: UUID,
        status: MeetingStatus | None = None,
        date_filter: date | None = None,
    ) -> list[MeetingResponse]:
        """Get meetings for a user, optionally filtered by status and date"""
        filtered_meetings = self.mock_meetings

        # Filter by date if provided
        if date_filter:
            filtered_meetings = [
                meeting
                for meeting in filtered_meetings
                if meeting.start_time.date() == date_filter
            ]

        # Filter by status if provided
        if status:
            filtered_meetings = [
                meeting for meeting in filtered_meetings if meeting.status == status
            ]

        return filtered_meetings

    async def create_meeting(
        self, user_id: UUID, meeting: MeetingCreateRequest
    ) -> MeetingResponse:
        """Create a new meeting"""
        duration_hours = (meeting.end_time - meeting.start_time).total_seconds() / 3600
        price_total = duration_hours * meeting.price_per_hour

        new_meeting = MeetingResponse(
            id=uuid4(),
            user_id=user_id,
            service_id=meeting.service_id,
            client_id=meeting.client_id,
            title=meeting.title,
            recurrence_id=meeting.recurrence_id,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            price_per_hour=meeting.price_per_hour,
            price_total=price_total,
            status=meeting.status,
            paid=meeting.paid,
            created_at=datetime.now(),
        )
        self.mock_meetings.append(new_meeting)
        return new_meeting

    async def update_meeting(
        self, user_id: UUID, meeting_id: UUID, meeting: MeetingUpdateRequest
    ) -> MeetingResponse:
        """Update an existing meeting"""
        for existing_meeting in self.mock_meetings:
            if existing_meeting.id == meeting_id:
                if meeting.service_id is not None:
                    existing_meeting.service_id = meeting.service_id
                if meeting.client_id is not None:
                    existing_meeting.client_id = meeting.client_id
                if meeting.title is not None:
                    existing_meeting.title = meeting.title
                if meeting.recurrence_id is not None:
                    existing_meeting.recurrence_id = meeting.recurrence_id
                if meeting.start_time is not None:
                    existing_meeting.start_time = meeting.start_time
                if meeting.end_time is not None:
                    existing_meeting.end_time = meeting.end_time
                if meeting.price_per_hour is not None:
                    existing_meeting.price_per_hour = meeting.price_per_hour
                if meeting.status is not None:
                    existing_meeting.status = meeting.status
                if meeting.paid is not None:
                    existing_meeting.paid = meeting.paid

                # Recalculate price_total if time or price changed
                if (
                    meeting.start_time is not None
                    or meeting.end_time is not None
                    or meeting.price_per_hour is not None
                ):
                    duration_hours = (
                        existing_meeting.end_time - existing_meeting.start_time
                    ).total_seconds() / 3600
                    existing_meeting.price_total = (
                        duration_hours * existing_meeting.price_per_hour
                    )

                return existing_meeting
        raise ValueError("Meeting not found")

    async def delete_meeting(self, user_id: UUID, meeting_id: UUID) -> bool:
        """Delete a meeting"""
        for i, meeting in enumerate(self.mock_meetings):
            if meeting.id == meeting_id:
                del self.mock_meetings[i]
                return True
        return False
