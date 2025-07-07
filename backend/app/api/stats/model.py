from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel


class PeriodType(str, Enum):
    LAST_7_DAYS = "last7days"
    LAST_30_DAYS = "last30days"
    LAST_90_DAYS = "last90days"
    THIS_MONTH = "thisMonth"
    THIS_YEAR = "thisYear"


class StatsOverview(BaseModel):
    total_meetings: int
    done_meetings: int
    canceled_meetings: int
    total_clients: int
    total_revenue: float
    total_hours: float


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
