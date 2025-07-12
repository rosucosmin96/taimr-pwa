from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class StatsOverview(BaseModel):
    total_meetings: int
    done_meetings: int
    canceled_meetings: int
    total_clients: int
    total_revenue: float
    total_hours: float
    # Membership stats
    total_memberships: int
    active_memberships: int
    membership_revenue: float
    membership_revenue_paid: float
    clients_with_memberships: int
    revenue_paid: float  # sum of price_total for meetings that are done and paid


class ClientStats(BaseModel):
    client_id: UUID
    client_name: str
    total_meetings: int
    done_meetings: int
    canceled_meetings: int
    total_revenue: float
    total_hours: float
    last_meeting: datetime | None = None


class ClientStatsResponse(BaseModel):
    client_stats: ClientStats
    meetings: list[dict]  # Will contain meeting details


class DailyBreakdownItem(BaseModel):
    date: str  # YYYY-MM-DD (UTC)
    revenue: float
    meetings_count: int
    meeting_ids: list[str]
