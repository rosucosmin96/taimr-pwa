from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.stats.model import (
    ClientStatsResponse,
    DailyBreakdownItem,
    StatsOverview,
)
from app.models import Client as ClientModel
from app.models import Meeting as MeetingModel
from app.models.meeting import MeetingStatus


class StatsService:
    def __init__(self, db: Session):
        self.db = db

    async def get_overview(
        self,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        service_id: UUID | None = None,
    ) -> StatsOverview:
        """Get overview statistics for a user (all calculations in Python)"""
        query = self.db.query(MeetingModel).filter(MeetingModel.user_id == str(user_id))
        if start_date:
            query = query.filter(MeetingModel.start_time >= start_date)
        if end_date:
            query = query.filter(MeetingModel.start_time <= end_date)
        if service_id:
            query = query.filter(MeetingModel.service_id == str(service_id))
        meetings = query.all()

        total_meetings = len(meetings)
        done_meetings = len(
            [m for m in meetings if m.status == MeetingStatus.DONE.value]
        )
        canceled_meetings = len(
            [m for m in meetings if m.status == MeetingStatus.CANCELED.value]
        )
        client_ids = {m.client_id for m in meetings}
        total_clients = len(client_ids)
        total_revenue = sum(
            float(m.price_total)
            for m in meetings
            if m.status == MeetingStatus.DONE.value
        )
        total_hours = sum(
            (m.end_time - m.start_time).total_seconds() / 3600
            for m in meetings
            if m.status == MeetingStatus.DONE.value
        )
        return StatsOverview(
            total_meetings=total_meetings,
            done_meetings=done_meetings,
            canceled_meetings=canceled_meetings,
            total_clients=total_clients,
            total_revenue=total_revenue,
            total_hours=total_hours,
        )

    async def get_client_stats(
        self,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        service_id: UUID | None = None,
    ) -> list[ClientStatsResponse]:
        """Get client statistics for a user (all calculations in Python)"""
        clients_query = self.db.query(ClientModel).filter(
            ClientModel.user_id == str(user_id)
        )
        if service_id:
            clients_query = clients_query.filter(
                ClientModel.service_id == str(service_id)
            )
        clients = clients_query.all()
        client_stats = []
        for client in clients:
            meetings_query = self.db.query(MeetingModel).filter(
                and_(
                    MeetingModel.user_id == str(user_id),
                    MeetingModel.client_id == client.id,
                )
            )
            if start_date:
                meetings_query = meetings_query.filter(
                    MeetingModel.start_time >= start_date
                )
            if end_date:
                meetings_query = meetings_query.filter(
                    MeetingModel.start_time <= end_date
                )
            meetings = meetings_query.all()
            if not meetings:
                continue
            total_meetings = len(meetings)
            done_meetings = len(
                [m for m in meetings if m.status == MeetingStatus.DONE.value]
            )
            canceled_meetings = len(
                [m for m in meetings if m.status == MeetingStatus.CANCELED.value]
            )
            total_revenue = sum(
                float(m.price_total)
                for m in meetings
                if m.status == MeetingStatus.DONE.value
            )
            total_hours = sum(
                (m.end_time - m.start_time).total_seconds() / 3600
                for m in meetings
                if m.status == MeetingStatus.DONE.value
            )
            last_meeting = (
                max(meetings, key=lambda m: m.start_time) if meetings else None
            )
            client_stat = ClientStatsResponse(
                client_id=UUID(client.id),
                client_name=client.name,
                total_meetings=total_meetings,
                done_meetings=done_meetings,
                canceled_meetings=canceled_meetings,
                total_revenue=total_revenue,
                total_hours=total_hours,
                last_meeting=last_meeting.start_time if last_meeting else None,
            )
            client_stats.append(client_stat)
        return client_stats

    async def get_daily_breakdown(
        self,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
        service_id: UUID | None = None,
    ) -> list[DailyBreakdownItem]:
        """Get daily breakdown of revenue and meetings for a user (all calculations in Python)"""
        query = self.db.query(MeetingModel).filter(
            MeetingModel.user_id == str(user_id),
            MeetingModel.start_time >= start_date,
            MeetingModel.start_time <= end_date,
            MeetingModel.status.in_(
                [MeetingStatus.DONE.value, MeetingStatus.UPCOMING.value]
            ),
        )
        if service_id:
            query = query.filter(MeetingModel.service_id == str(service_id))
        meetings = query.all()
        # Group by day (UTC)
        from collections import defaultdict

        day_map = defaultdict(lambda: {"revenue": 0.0, "meeting_ids": []})
        for m in meetings:
            day = m.start_time.astimezone(UTC).date().isoformat()
            if m.status == MeetingStatus.DONE.value:
                day_map[day]["revenue"] += float(m.price_total)
            day_map[day]["meeting_ids"].append(m.id)
        # Build result list for each day in range
        result = []
        current = start_date.date()
        while current <= end_date.date():
            day_str = current.isoformat()
            info = day_map.get(day_str, {"revenue": 0.0, "meeting_ids": []})
            result.append(
                DailyBreakdownItem(
                    date=day_str,
                    revenue=info["revenue"],
                    meetings_count=len(info["meeting_ids"]),
                    meeting_ids=info["meeting_ids"],
                )
            )
            current += timedelta(days=1)
        return result
