from datetime import date, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.api.meetings.model import (
    MeetingCreateRequest,
    MeetingStatus,
    MeetingUpdateRequest,
)
from app.api.meetings.service import MeetingService
from app.database.factory import DatabaseFactory
from app.models import Client, Service, User


class TestMeetingService:
    """Test cases for MeetingService with database operations."""

    @pytest.fixture
    def db_session(self):
        """Create a test database session."""
        db_provider = DatabaseFactory.create_provider(":memory:")
        db_provider.create_tables()
        session = db_provider.get_session()
        yield session
        session.close()

    @pytest.fixture
    def test_user(self, db_session: Session):
        """Create a test user."""
        user = User(id=str(uuid4()), email="test@example.com", name="Test User")
        db_session.add(user)
        db_session.commit()
        return user

    @pytest.fixture
    def test_service(self, db_session: Session, test_user):
        """Create a test service."""
        service = Service(
            id=str(uuid4()),
            user_id=test_user.id,
            name="Test Service",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        )
        db_session.add(service)
        db_session.commit()
        return service

    @pytest.fixture
    def test_client(self, db_session: Session, test_user, test_service):
        """Create a test client."""
        client = Client(
            id=str(uuid4()),
            user_id=test_user.id,
            service_id=test_service.id,
            name="Test Client",
            email="client@example.com",
        )
        db_session.add(client)
        db_session.commit()
        return client

    @pytest.fixture
    def meeting_service(self, db_session: Session):
        """Create a MeetingService instance."""
        return MeetingService(db_session)

    async def test_create_meeting(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test creating a new meeting."""
        meeting_data = MeetingCreateRequest(
            service_id=UUID(test_service.id),
            client_id=UUID(test_client.id),
            title="Test Meeting",
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=1),
            price_per_hour=100.0,
            status=MeetingStatus.UPCOMING,
            paid=False,
        )

        result = await meeting_service.create_meeting(UUID(test_user.id), meeting_data)

        assert result.user_id == UUID(test_user.id)
        assert result.service_id == UUID(test_service.id)
        assert result.client_id == UUID(test_client.id)
        assert result.title == "Test Meeting"
        assert result.price_total == 100.0
        assert result.status == MeetingStatus.UPCOMING
        assert result.paid is False

    async def test_get_meetings(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test getting meetings for a user."""
        # Create a test meeting
        meeting_data = MeetingCreateRequest(
            service_id=UUID(test_service.id),
            client_id=UUID(test_client.id),
            title="Test Meeting",
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=1),
            price_per_hour=100.0,
            status=MeetingStatus.UPCOMING,
            paid=False,
        )

        await meeting_service.create_meeting(UUID(test_user.id), meeting_data)

        # Get meetings
        meetings = await meeting_service.get_meetings(UUID(test_user.id))

        assert len(meetings) == 1
        assert meetings[0].title == "Test Meeting"

    async def test_get_meetings_with_status_filter(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test getting meetings filtered by status."""
        # Create meetings with different statuses
        for status in [MeetingStatus.UPCOMING, MeetingStatus.DONE]:
            meeting_data = MeetingCreateRequest(
                service_id=UUID(test_service.id),
                client_id=UUID(test_client.id),
                title=f"Test Meeting {status.value}",
                start_time=datetime.now(),
                end_time=datetime.now() + timedelta(hours=1),
                price_per_hour=100.0,
                status=status,
                paid=False,
            )
            await meeting_service.create_meeting(UUID(test_user.id), meeting_data)

        # Get only upcoming meetings
        upcoming_meetings = await meeting_service.get_meetings(
            UUID(test_user.id), status=MeetingStatus.UPCOMING
        )

        assert len(upcoming_meetings) == 1
        assert upcoming_meetings[0].status == MeetingStatus.UPCOMING

    async def test_get_meetings_with_date_filter(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test getting meetings filtered by date."""
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # Create meetings on different dates
        for meeting_date in [today, tomorrow]:
            meeting_data = MeetingCreateRequest(
                service_id=UUID(test_service.id),
                client_id=UUID(test_client.id),
                title=f"Test Meeting {meeting_date}",
                start_time=datetime.combine(
                    meeting_date, datetime.min.time().replace(hour=9)
                ),
                end_time=datetime.combine(
                    meeting_date, datetime.min.time().replace(hour=10)
                ),
                price_per_hour=100.0,
                status=MeetingStatus.UPCOMING,
                paid=False,
            )
            await meeting_service.create_meeting(UUID(test_user.id), meeting_data)

        # Get only today's meetings
        today_meetings = await meeting_service.get_meetings(
            UUID(test_user.id), date_filter=today
        )

        assert len(today_meetings) == 1
        assert today_meetings[0].start_time.date() == today

    async def test_update_meeting(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test updating a meeting."""
        # Create a meeting
        meeting_data = MeetingCreateRequest(
            service_id=UUID(test_service.id),
            client_id=UUID(test_client.id),
            title="Original Title",
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=1),
            price_per_hour=100.0,
            status=MeetingStatus.UPCOMING,
            paid=False,
        )

        created_meeting = await meeting_service.create_meeting(
            UUID(test_user.id), meeting_data
        )

        # Update the meeting
        update_data = MeetingUpdateRequest(
            title="Updated Title", status=MeetingStatus.DONE, paid=True
        )

        updated_meeting = await meeting_service.update_meeting(
            UUID(test_user.id), created_meeting.id, update_data
        )

        assert updated_meeting.title == "Updated Title"
        assert updated_meeting.status == MeetingStatus.DONE
        assert updated_meeting.paid is True

    async def test_delete_meeting(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test deleting a meeting."""
        # Create a meeting
        meeting_data = MeetingCreateRequest(
            service_id=UUID(test_service.id),
            client_id=UUID(test_client.id),
            title="Test Meeting",
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(hours=1),
            price_per_hour=100.0,
            status=MeetingStatus.UPCOMING,
            paid=False,
        )

        created_meeting = await meeting_service.create_meeting(
            UUID(test_user.id), meeting_data
        )

        # Delete the meeting
        success = await meeting_service.delete_meeting(
            UUID(test_user.id), created_meeting.id
        )

        assert success is True

        # Verify meeting is deleted
        meetings = await meeting_service.get_meetings(UUID(test_user.id))
        assert len(meetings) == 0

    async def test_get_recurring_meetings(
        self, meeting_service, test_user, test_service, test_client
    ):
        """Test getting meetings for a specific recurrence."""
        recurrence_id = uuid4()

        # Create meetings with recurrence
        for i in range(3):
            meeting_data = MeetingCreateRequest(
                service_id=UUID(test_service.id),
                client_id=UUID(test_client.id),
                title=f"Recurring Meeting {i}",
                recurrence_id=recurrence_id,
                start_time=datetime.now() + timedelta(days=i),
                end_time=datetime.now() + timedelta(days=i, hours=1),
                price_per_hour=100.0,
                status=MeetingStatus.UPCOMING,
                paid=False,
            )
            await meeting_service.create_meeting(UUID(test_user.id), meeting_data)

        # Get recurring meetings
        recurring_meetings = await meeting_service.get_recurring_meetings(
            UUID(test_user.id), recurrence_id
        )

        assert len(recurring_meetings) == 3
        for meeting in recurring_meetings:
            assert meeting.recurrence_id == recurrence_id

    async def test_meeting_not_found(self, meeting_service, test_user):
        """Test handling of non-existent meeting."""
        non_existent_id = uuid4()

        with pytest.raises(ValueError, match="Meeting not found"):
            await meeting_service.update_meeting(
                UUID(test_user.id),
                non_existent_id,
                MeetingUpdateRequest(title="Updated"),
            )

    async def test_delete_nonexistent_meeting(self, meeting_service, test_user):
        """Test deleting a non-existent meeting."""
        non_existent_id = uuid4()

        success = await meeting_service.delete_meeting(
            UUID(test_user.id), non_existent_id
        )

        assert success is False
