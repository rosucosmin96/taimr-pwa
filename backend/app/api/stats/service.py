from datetime import date, datetime, timedelta
from uuid import UUID

from app.api.stats.model import (
    ClientStats,
    ClientStatsResponse,
    PeriodType,
    StatsOverview,
)


class StatsService:
    def __init__(self):
        # Mock data
        self.mock_overview = StatsOverview(
            total_meetings=15,
            done_meetings=12,
            canceled_meetings=2,
            total_clients=5,
            total_revenue=1250.0,
            total_hours=18.5,
        )

        self.mock_client_stats = ClientStats(
            client_id=UUID("44444444-4444-4444-4444-444444444444"),
            client_name="John Smith",
            total_meetings=6,
            done_meetings=5,
            canceled_meetings=1,
            total_revenue=480.0,
            total_hours=8.0,
            last_meeting=datetime(2024, 3, 10, 16, 0, 0),
        )

        self.mock_meetings = [
            {
                "id": "77777777-7777-7777-7777-777777777777",
                "start_time": "2024-03-15T14:00:00",
                "end_time": "2024-03-15T16:00:00",
                "status": "upcoming",
                "price_total": 160.0,
                "paid": False,
            },
            {
                "id": "88888888-8888-8888-8888-888888888888",
                "start_time": "2024-03-10T10:00:00",
                "end_time": "2024-03-10T11:30:00",
                "status": "done",
                "price_total": 90.0,
                "paid": True,
            },
        ]

    async def get_overview(
        self,
        user_id: UUID,
        period: PeriodType = PeriodType.LAST_7_DAYS,
        service_id: UUID | None = None,
    ) -> StatsOverview:
        """Get overview statistics for a user"""
        return self.mock_overview

    async def get_day_stats(self, user_id: UUID, target_date: date) -> StatsOverview:
        """Get statistics for a specific day (only done meetings)"""
        # Mock data for today's stats
        today = date.today()
        if target_date == today:
            return StatsOverview(
                total_meetings=3,
                done_meetings=1,
                canceled_meetings=1,
                total_clients=2,
                total_revenue=120.0,
                total_hours=1.5,
            )
        else:
            return StatsOverview(
                total_meetings=0,
                done_meetings=0,
                canceled_meetings=0,
                total_clients=0,
                total_revenue=0.0,
                total_hours=0.0,
            )

    async def get_week_stats(self, user_id: UUID, target_date: date) -> StatsOverview:
        """Get statistics for the week containing the target date (only done meetings)"""
        # Mock data for current week stats
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        if week_start <= target_date <= week_end:
            return StatsOverview(
                total_meetings=8,
                done_meetings=6,
                canceled_meetings=1,
                total_clients=4,
                total_revenue=480.0,
                total_hours=9.0,
            )
        else:
            return StatsOverview(
                total_meetings=0,
                done_meetings=0,
                canceled_meetings=0,
                total_clients=0,
                total_revenue=0.0,
                total_hours=0.0,
            )

    async def get_client_stats(
        self, user_id: UUID, client_id: UUID
    ) -> ClientStatsResponse:
        """Get detailed statistics for a specific client"""
        return ClientStatsResponse(
            client_stats=self.mock_client_stats, meetings=self.mock_meetings
        )
