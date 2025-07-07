from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.auth import get_current_user_id
from app.api.stats.model import ClientStatsResponse, PeriodType, StatsOverview
from app.api.stats.service import StatsService

router = APIRouter()
stats_service = StatsService()


@router.get("/overview", response_model=StatsOverview)
async def get_stats_overview(
    period: PeriodType = Query(PeriodType.LAST_7_DAYS),
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
):
    """Get overview statistics for the current user"""
    return await stats_service.get_overview(user_id, period, service_id)


@router.get("/client/{client_id}", response_model=ClientStatsResponse)
async def get_client_stats(
    client_id: UUID, user_id: UUID = Depends(get_current_user_id)
):
    """Get detailed statistics for a specific client"""
    return await stats_service.get_client_stats(user_id, client_id)
