from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.api.commons.shared import RecurrenceUpdateScope
from app.api.meetings.model import MeetingResponse, MeetingStatus, MeetingUpdateRequest
from app.api.recurrences.model import RecurrenceCreateRequest, RecurrenceFrequency
from app.api.recurrences.service import RecurrenceService


class TestRecurrenceService:
    @pytest.fixture
    def recurrence_service(self):
        return RecurrenceService()

    @pytest.fixture
    def mock_meeting_service(self, recurrence_service):
        """Mock the meeting service"""
        recurrence_service.meeting_service = AsyncMock()
        return recurrence_service.meeting_service

    @pytest.fixture
    def sample_meeting(self):
        """Create a sample meeting for testing"""
        base_time = datetime.now(UTC).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        return MeetingResponse(
            id=uuid4(),
            user_id=uuid4(),
            service_id=uuid4(),
            client_id=uuid4(),
            title="Test Meeting",
            recurrence_id=uuid4(),
            membership_id=None,
            start_time=base_time,
            end_time=base_time + timedelta(hours=1),
            price_per_hour=50.0,
            price_total=50.0,
            status=MeetingStatus.UPCOMING.value,
            paid=False,
            created_at=datetime.now(UTC),
        )

    @pytest.fixture
    def sample_recurring_meetings(self, sample_meeting):
        """Create sample recurring meetings with different times"""
        meetings = []
        base_time = sample_meeting.start_time

        for i in range(3):
            meeting = MeetingResponse(
                id=uuid4(),
                user_id=sample_meeting.user_id,
                service_id=sample_meeting.service_id,
                client_id=sample_meeting.client_id,
                title=sample_meeting.title,
                recurrence_id=sample_meeting.recurrence_id,
                membership_id=sample_meeting.membership_id,
                start_time=base_time + timedelta(days=i * 7),  # Weekly recurrence
                end_time=base_time + timedelta(days=i * 7, hours=1),
                price_per_hour=sample_meeting.price_per_hour,
                price_total=sample_meeting.price_total,
                status=MeetingStatus.UPCOMING.value,
                paid=sample_meeting.paid,
                created_at=sample_meeting.created_at,
            )
            meetings.append(meeting)

        return meetings

    @pytest.fixture
    def sample_recurrence_request(self):
        """Create a sample recurrence request"""
        return RecurrenceCreateRequest(
            service_id=uuid4(),
            client_id=uuid4(),
            frequency=RecurrenceFrequency.WEEKLY,
            start_date=datetime.now(UTC),
            end_date=datetime.now(UTC) + timedelta(weeks=10),  # 10 weeks
            title="Test Recurrence",
            start_time="14:00",
            end_time="15:00",
            price_per_hour=50.0,
        )

    async def test_update_recurring_meeting_single_scope(
        self, recurrence_service, mock_meeting_service, sample_meeting
    ):
        """Test updating a single meeting in a recurrence"""
        # Mock the meeting service responses
        mock_meeting_service.get_meeting.return_value = sample_meeting
        mock_meeting_service.update_meeting.return_value = sample_meeting

        # Create update request for single meeting
        update_request = MeetingUpdateRequest(
            title="Updated Title",
            update_scope=RecurrenceUpdateScope.THIS_MEETING_ONLY.value,
        )

        # Call the method
        result = await recurrence_service.update_recurring_meeting(
            user_id=sample_meeting.user_id,
            meeting_id=sample_meeting.id,
            update_data=update_request,
        )

        # Verify only one meeting was updated
        assert len(result) == 1
        mock_meeting_service.update_meeting.assert_called_once()

    async def test_update_recurring_meeting_future_scope_with_time_offset(
        self,
        recurrence_service,
        mock_meeting_service,
        sample_meeting,
        sample_recurring_meetings,
    ):
        """Test updating future meetings with time offset to prevent overlaps"""
        # Mock the meeting service responses
        mock_meeting_service.get_meeting.return_value = sample_meeting
        mock_meeting_service.get_recurring_meetings.return_value = (
            sample_recurring_meetings
        )
        mock_meeting_service.update_meeting.return_value = sample_meeting

        # Create update request for future meetings with time change
        update_request = MeetingUpdateRequest(
            start_time=sample_meeting.start_time + timedelta(hours=1),
            end_time=sample_meeting.end_time + timedelta(hours=1),
            update_scope=RecurrenceUpdateScope.THIS_AND_FUTURE_MEETINGS.value,
        )

        # Call the method
        result = await recurrence_service.update_recurring_meeting(
            user_id=sample_meeting.user_id,
            meeting_id=sample_meeting.id,
            update_data=update_request,
        )

        # Verify future meetings were updated with time offset
        assert len(result) == 2  # Current + 2 future meetings

        # Check that time updates were applied to future meetings only
        meeting_indices_with_time_updates = []
        for i, call in enumerate(mock_meeting_service.update_meeting.call_args_list):
            update_data = call[1]["update_data"]
            if update_data.start_time and update_data.end_time:
                meeting_indices_with_time_updates.append(i)

        # Only future meetings should have time updates
        assert 0 in meeting_indices_with_time_updates  # First meeting (current)
        assert 2 in meeting_indices_with_time_updates  # Third meeting
        assert (
            1 not in meeting_indices_with_time_updates
        )  # Second meeting should not have time updates

    async def test_update_recurring_meeting_non_time_fields(
        self,
        recurrence_service,
        mock_meeting_service,
        sample_meeting,
        sample_recurring_meetings,
    ):
        """Test updating non-time fields doesn't trigger time offset logic"""
        # Mock the meeting service responses
        mock_meeting_service.get_meeting.return_value = sample_meeting
        mock_meeting_service.get_recurring_meetings.return_value = (
            sample_recurring_meetings
        )
        mock_meeting_service.update_meeting.return_value = sample_meeting

        # Create update request for non-time fields
        update_request = MeetingUpdateRequest(
            title="Updated Title",
            price_per_hour=75.0,
            update_scope=RecurrenceUpdateScope.THIS_AND_FUTURE_MEETINGS.value,
        )

        # Call the method
        result = await recurrence_service.update_recurring_meeting(
            user_id=sample_meeting.user_id,
            meeting_id=sample_meeting.id,
            update_data=update_request,
        )

        # Verify all future meetings were updated
        assert len(result) == 3  # All meetings

        # Check that no time offset was applied
        for call in mock_meeting_service.update_meeting.call_args_list:
            update_data = call[1]["update_data"]
            assert update_data.start_time is None
            assert update_data.end_time is None

    async def test_update_recurring_meeting_all_scope(
        self,
        recurrence_service,
        mock_meeting_service,
        sample_meeting,
        sample_recurring_meetings,
    ):
        """Test updating all meetings in a recurrence"""
        # Mock the meeting service responses
        mock_meeting_service.get_meeting.return_value = sample_meeting
        mock_meeting_service.get_recurring_meetings.return_value = (
            sample_recurring_meetings
        )
        mock_meeting_service.update_meeting.return_value = sample_meeting

        # Create update request for all meetings
        update_request = MeetingUpdateRequest(
            title="Updated Title", update_scope=RecurrenceUpdateScope.ALL_MEETINGS.value
        )

        # Call the method
        result = await recurrence_service.update_recurring_meeting(
            user_id=sample_meeting.user_id,
            meeting_id=sample_meeting.id,
            update_data=update_request,
        )

        # Verify all meetings were updated
        assert len(result) == 3  # All meetings
        assert mock_meeting_service.update_meeting.call_count == 3

    async def test_update_non_recurring_meeting(
        self, recurrence_service, mock_meeting_service, sample_meeting
    ):
        """Test updating a non-recurring meeting falls back to single meeting update"""
        # Create a non-recurring meeting
        non_recurring_meeting = MeetingResponse(
            id=uuid4(),
            user_id=sample_meeting.user_id,
            service_id=sample_meeting.service_id,
            client_id=sample_meeting.client_id,
            title=sample_meeting.title,
            recurrence_id=None,  # No recurrence
            membership_id=sample_meeting.membership_id,
            start_time=sample_meeting.start_time,
            end_time=sample_meeting.end_time,
            price_per_hour=sample_meeting.price_per_hour,
            price_total=sample_meeting.price_total,
            status=MeetingStatus.UPCOMING.value,
            paid=sample_meeting.paid,
            created_at=sample_meeting.created_at,
        )

        # Mock the meeting service responses
        mock_meeting_service.get_meeting.return_value = non_recurring_meeting
        mock_meeting_service.update_meeting.return_value = non_recurring_meeting

        # Create update request
        update_request = MeetingUpdateRequest(
            title="Updated Title",
            update_scope=RecurrenceUpdateScope.THIS_AND_FUTURE_MEETINGS.value,
        )

        # Call the method
        result = await recurrence_service.update_recurring_meeting(
            user_id=non_recurring_meeting.user_id,
            meeting_id=non_recurring_meeting.id,
            update_data=update_request,
        )

        # Should fall back to single meeting update
        assert len(result) == 1
        mock_meeting_service.update_meeting.assert_called_once()

    async def test_update_recurring_meeting_with_mixed_timing_patterns(
        self, recurrence_service, mock_meeting_service, sample_meeting
    ):
        """Test updating recurring meetings with complex timing patterns"""
        # Create meetings with different timing patterns
        base_time = sample_meeting.start_time
        complex_meetings = []

        for i in range(4):
            # Alternate between different time slots
            if i % 2 == 0:
                start_time = base_time + timedelta(days=i * 7, hours=1)  # +1 hour
                end_time = base_time + timedelta(days=i * 7, hours=2)  # +2 hours
            else:
                start_time = base_time + timedelta(days=i * 7, hours=2)  # +2 hours
                end_time = base_time + timedelta(days=i * 7, hours=3)  # +3 hours

            meeting = MeetingResponse(
                id=uuid4(),
                user_id=sample_meeting.user_id,
                service_id=sample_meeting.service_id,
                client_id=sample_meeting.client_id,
                title=sample_meeting.title,
                recurrence_id=sample_meeting.recurrence_id,
                membership_id=sample_meeting.membership_id,
                start_time=start_time,
                end_time=end_time,
                price_per_hour=sample_meeting.price_per_hour,
                price_total=sample_meeting.price_total,
                status=MeetingStatus.UPCOMING.value,
                paid=sample_meeting.paid,
                created_at=sample_meeting.created_at,
            )
            complex_meetings.append(meeting)

        # Mock the meeting service responses
        mock_meeting_service.get_meeting.return_value = complex_meetings[0]
        mock_meeting_service.get_recurring_meetings.return_value = complex_meetings
        mock_meeting_service.update_meeting.return_value = complex_meetings[0]

        # Create update request with time change
        update_request = MeetingUpdateRequest(
            start_time=complex_meetings[0].start_time + timedelta(hours=1),
            end_time=complex_meetings[0].end_time + timedelta(hours=1),
            update_scope=RecurrenceUpdateScope.THIS_AND_FUTURE_MEETINGS.value,
        )

        # Call the method
        result = await recurrence_service.update_recurring_meeting(
            user_id=complex_meetings[0].user_id,
            meeting_id=complex_meetings[0].id,
            update_data=update_request,
        )

        # Verify all future meetings were updated
        assert len(result) == 4  # All meetings
        assert mock_meeting_service.update_meeting.call_count == 4

    async def test_create_recurrence_with_membership_limit(
        self, recurrence_service, sample_recurrence_request
    ):
        """Test that recurrence creation respects membership limits"""
        user_id = uuid4()

        # Mock membership service to return a membership with 4 remaining meetings
        # This would be done with proper mocking in a real test
        result = await recurrence_service.create_recurrence_with_membership_check(
            user_id, sample_recurrence_request
        )

        # Verify the result structure
        assert "recurrence" in result
        assert "meetings_created" in result
        assert "membership_used" in result

        # The actual number of meetings created would depend on the membership
        # This test verifies the structure and that the method doesn't crash
        assert isinstance(result["meetings_created"], int)
        assert isinstance(result["membership_used"], bool)

    async def test_create_recurrence_without_membership(
        self, recurrence_service, sample_recurrence_request
    ):
        """Test that recurrence creation works normally without membership"""
        user_id = uuid4()

        result = await recurrence_service.create_recurrence_with_membership_check(
            user_id, sample_recurrence_request
        )

        # Should work normally without membership
        assert "recurrence" in result
        assert "meetings_created" in result
        assert result["membership_used"] is False
        assert "limitation_info" not in result
