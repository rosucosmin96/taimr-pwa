from datetime import date, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy.orm import Session

from app.api.stats.service import StatsService
from app.database.factory import DatabaseFactory
from app.models import Client, Meeting, Service, User


class TestStatsService:
    """Test cases for StatsService with database operations."""

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
    def stats_service(self, db_session: Session):
        """Create a StatsService instance."""
        return StatsService(db_session)

    async def test_get_overview_no_meetings(self, stats_service, test_user):
        """Test getting overview with no meetings."""
        result = await stats_service.get_overview(UUID(test_user.id))

        assert result.total_meetings == 0
        assert result.done_meetings == 0
        assert result.canceled_meetings == 0
        assert result.total_clients == 0
        assert result.total_revenue == 0.0
        assert result.total_hours == 0.0

    async def test_get_overview_with_meetings(
        self, stats_service, test_user, test_service, test_client
    ):
        """Test getting overview with meetings."""
        # Create meetings with different statuses
        meetings_data = [
            {"status": "done", "price_total": 100.0, "duration_hours": 1.0},
            {"status": "done", "price_total": 150.0, "duration_hours": 1.5},
            {"status": "canceled", "price_total": 0.0, "duration_hours": 0.0},
            {"status": "upcoming", "price_total": 0.0, "duration_hours": 0.0},
        ]

        for i, meeting_data in enumerate(meetings_data):
            meeting = Meeting(
                id=str(uuid4()),
                user_id=test_user.id,
                service_id=test_service.id,
                client_id=test_client.id,
                title=f"Meeting {i}",
                start_time=datetime.now() + timedelta(days=i),
                end_time=datetime.now()
                + timedelta(days=i, hours=meeting_data["duration_hours"]),
                price_per_hour=100.0,
                price_total=meeting_data["price_total"],
                status=meeting_data["status"],
                paid=False,
            )
            stats_service.db.add(meeting)

        stats_service.db.commit()

        result = await stats_service.get_overview(UUID(test_user.id))

        assert result.total_meetings == 4
        assert result.done_meetings == 2
        assert result.canceled_meetings == 1
        assert result.total_clients == 1
        assert result.total_revenue == 250.0
        assert result.total_hours == 2.5

    async def test_get_overview_with_date_filter(
        self, stats_service, test_user, test_service, test_client
    ):
        """Test getting overview with date filter."""
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # Create meetings on different dates
        for i, meeting_date in enumerate([today, tomorrow]):
            meeting = Meeting(
                id=str(uuid4()),
                user_id=test_user.id,
                service_id=test_service.id,
                client_id=test_client.id,
                title=f"Meeting {i}",
                start_time=datetime.combine(
                    meeting_date, datetime.min.time().replace(hour=9)
                ),
                end_time=datetime.combine(
                    meeting_date, datetime.min.time().replace(hour=10)
                ),
                price_per_hour=100.0,
                price_total=100.0,
                status="done",
                paid=False,
            )
            stats_service.db.add(meeting)

        stats_service.db.commit()

        # Get overview for today only
        result = await stats_service.get_overview(
            UUID(test_user.id), start_date=today, end_date=today
        )

        assert result.total_meetings == 1
        assert result.done_meetings == 1
        assert result.total_revenue == 100.0

    async def test_get_client_stats(
        self, stats_service, test_user, test_service, test_client
    ):
        """Test getting client statistics."""
        # Create meetings for the client
        meetings_data = [
            {"status": "done", "price_total": 100.0, "duration_hours": 1.0},
            {"status": "done", "price_total": 150.0, "duration_hours": 1.5},
            {"status": "canceled", "price_total": 0.0, "duration_hours": 0.0},
        ]

        for i, meeting_data in enumerate(meetings_data):
            meeting = Meeting(
                id=str(uuid4()),
                user_id=test_user.id,
                service_id=test_service.id,
                client_id=test_client.id,
                title=f"Meeting {i}",
                start_time=datetime.now() + timedelta(days=i),
                end_time=datetime.now()
                + timedelta(days=i, hours=meeting_data["duration_hours"]),
                price_per_hour=100.0,
                price_total=meeting_data["price_total"],
                status=meeting_data["status"],
                paid=False,
            )
            stats_service.db.add(meeting)

        stats_service.db.commit()

        result = await stats_service.get_client_stats(UUID(test_user.id))

        assert len(result) == 1
        client_stat = result[0]
        assert client_stat.client_id == UUID(test_client.id)
        assert client_stat.client_name == "Test Client"
        assert client_stat.total_meetings == 3
        assert client_stat.done_meetings == 2
        assert client_stat.canceled_meetings == 1
        assert client_stat.total_revenue == 250.0
        assert client_stat.total_hours == 2.5

    async def test_get_client_stats_with_date_filter(
        self, stats_service, test_user, test_service, test_client
    ):
        """Test getting client statistics with date filter."""
        today = date.today()
        tomorrow = today + timedelta(days=1)

        # Create meetings on different dates
        for i, meeting_date in enumerate([today, tomorrow]):
            meeting = Meeting(
                id=str(uuid4()),
                user_id=test_user.id,
                service_id=test_service.id,
                client_id=test_client.id,
                title=f"Meeting {i}",
                start_time=datetime.combine(
                    meeting_date, datetime.min.time().replace(hour=9)
                ),
                end_time=datetime.combine(
                    meeting_date, datetime.min.time().replace(hour=10)
                ),
                price_per_hour=100.0,
                price_total=100.0,
                status="done",
                paid=False,
            )
            stats_service.db.add(meeting)

        stats_service.db.commit()

        # Get client stats for today only
        result = await stats_service.get_client_stats(
            UUID(test_user.id), start_date=today, end_date=today
        )

        assert len(result) == 1
        client_stat = result[0]
        assert client_stat.total_meetings == 1
        assert client_stat.done_meetings == 1
        assert client_stat.total_revenue == 100.0
