from datetime import datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app.api.meetings.model import MeetingStatus
from app.api.stats.service import StatsService
from app.models import Client, Meeting, Membership, Service, User
from app.storage.factory import StorageFactory


class TestStatsService:
    """Test cases for StatsService with storage operations."""

    @pytest.fixture
    def stats_service(self):
        """Create a StatsService instance."""
        return StatsService()

    @pytest.fixture
    def test_user_id(self):
        """Create a test user ID."""
        return UUID(uuid4())

    @pytest.fixture
    async def setup_test_data(self, test_user_id):
        """Setup test data using storage."""
        # Create test user
        user_storage = StorageFactory.create_storage_service(
            model_class=User, response_class=None, table_name="users"
        )

        user_data = {
            "id": str(test_user_id),
            "email": "test@example.com",
            "name": "Test User",
            "profile_picture_url": None,
            "tutorial_checked": False,
        }
        await user_storage.create(test_user_id, user_data)

        # Create test service
        service_id = UUID(uuid4())
        service_storage = StorageFactory.create_storage_service(
            model_class=Service, response_class=None, table_name="services"
        )

        service_data = {
            "id": str(service_id),
            "user_id": str(test_user_id),
            "name": "Test Service",
            "default_duration_minutes": 60,
            "default_price_per_hour": 100.0,
        }
        await service_storage.create(test_user_id, service_data)

        # Create test client
        client_id = UUID(uuid4())
        client_storage = StorageFactory.create_storage_service(
            model_class=Client, response_class=None, table_name="clients"
        )

        client_data = {
            "id": str(client_id),
            "user_id": str(test_user_id),
            "service_id": str(service_id),
            "name": "Test Client",
            "email": "client@example.com",
            "phone": "+1-555-0000",
        }
        await client_storage.create(test_user_id, client_data)

        # Create test meetings
        meeting_storage = StorageFactory.create_storage_service(
            model_class=Meeting, response_class=None, table_name="meetings"
        )

        now = datetime.utcnow()

        # Done meeting
        done_meeting_data = {
            "id": str(uuid4()),
            "user_id": str(test_user_id),
            "service_id": str(service_id),
            "client_id": str(client_id),
            "title": "Done Meeting",
            "start_time": now - timedelta(hours=2),
            "end_time": now - timedelta(hours=1),
            "price_per_hour": 100.0,
            "price_total": 100.0,
            "status": MeetingStatus.DONE.value,
            "paid": True,
        }
        await meeting_storage.create(test_user_id, done_meeting_data)

        # Upcoming meeting
        upcoming_meeting_data = {
            "id": str(uuid4()),
            "user_id": str(test_user_id),
            "service_id": str(service_id),
            "client_id": str(client_id),
            "title": "Upcoming Meeting",
            "start_time": now + timedelta(hours=1),
            "end_time": now + timedelta(hours=2),
            "price_per_hour": 100.0,
            "price_total": 100.0,
            "status": MeetingStatus.UPCOMING.value,
            "paid": False,
        }
        await meeting_storage.create(test_user_id, upcoming_meeting_data)

        # Create test membership
        membership_storage = StorageFactory.create_storage_service(
            model_class=Membership, response_class=None, table_name="memberships"
        )

        membership_data = {
            "id": str(uuid4()),
            "user_id": str(test_user_id),
            "service_id": str(service_id),
            "client_id": str(client_id),
            "name": "Test Membership",
            "total_meetings": 10,
            "price_per_membership": 500.0,
            "price_per_meeting": 50.0,
            "availability_days": 30,
            "status": "active",
            "paid": True,
        }
        await membership_storage.create(test_user_id, membership_data)

    async def test_get_overview(self, stats_service, test_user_id, setup_test_data):
        """Test getting overview statistics."""
        overview = await stats_service.get_overview(test_user_id)

        assert overview.total_meetings == 2
        assert overview.done_meetings == 1
        assert overview.canceled_meetings == 0
        assert overview.total_clients == 1
        assert overview.total_revenue == 100.0  # Only done meetings count
        assert overview.total_hours == 1.0  # 1 hour meeting
        assert overview.total_memberships == 1
        assert overview.active_memberships == 1
        assert overview.membership_revenue == 500.0
        assert overview.membership_revenue_paid == 500.0
        assert overview.clients_with_memberships == 1
        assert overview.revenue_paid == 100.0  # Only paid done meetings

    async def test_get_client_stats(self, stats_service, test_user_id, setup_test_data):
        """Test getting client statistics."""
        client_stats = await stats_service.get_client_stats(test_user_id)

        assert len(client_stats) == 1
        client_stat = client_stats[0]

        assert client_stat.client_stats.total_meetings == 2
        assert client_stat.client_stats.done_meetings == 1
        assert client_stat.client_stats.canceled_meetings == 0
        assert client_stat.client_stats.total_revenue == 100.0
        assert client_stat.client_stats.total_hours == 1.0
        assert len(client_stat.meetings) == 2

    async def test_get_daily_breakdown(
        self, stats_service, test_user_id, setup_test_data
    ):
        """Test getting daily breakdown."""
        now = datetime.utcnow()
        start_date = now - timedelta(days=1)
        end_date = now + timedelta(days=1)

        breakdown = await stats_service.get_daily_breakdown(
            test_user_id, start_date, end_date
        )

        assert len(breakdown) > 0
        # Should have entries for each day in the range
        assert any(d.revenue > 0 for d in breakdown)
        assert any(d.meetings_count > 0 for d in breakdown)
