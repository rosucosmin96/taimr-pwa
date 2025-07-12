from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.auth import get_current_user_id
from app.api.stats.model import ClientStatsResponse, DailyBreakdownItem, StatsOverview
from app.api.stats.service import StatsService
from app.database import get_db

router = APIRouter()


@router.get("/overview", response_model=StatsOverview)
async def get_stats_overview(
    start_date: datetime | None = Query(
        None, description="Start datetime (UTC, ISO 8601) for custom period (inclusive)"
    ),
    end_date: datetime | None = Query(
        None, description="End datetime (UTC, ISO 8601) for custom period (inclusive)"
    ),
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get overview statistics for the current user.
    If no datetimes provided, returns all-time stats.
    If datetimes provided, returns stats for the specified period."""
    service = StatsService(db)
    return await service.get_overview(user_id, start_date, end_date, service_id)


@router.get("/clients", response_model=list[ClientStatsResponse])
async def get_client_stats(
    start_date: datetime | None = Query(
        None, description="Start datetime (UTC, ISO 8601) for custom period (inclusive)"
    ),
    end_date: datetime | None = Query(
        None, description="End datetime (UTC, ISO 8601) for custom period (inclusive)"
    ),
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get client statistics for the current user.
    If no datetimes provided, returns all-time stats.
    If datetimes provided, returns stats for the specified period."""
    service = StatsService(db)
    return await service.get_client_stats(user_id, start_date, end_date, service_id)


@router.get("/clients/{client_id}", response_model=ClientStatsResponse)
async def get_single_client_stats(
    client_id: UUID,
    start_date: datetime | None = Query(
        None, description="Start datetime (UTC, ISO 8601) for custom period (inclusive)"
    ),
    end_date: datetime | None = Query(
        None, description="End datetime (UTC, ISO 8601) for custom period (inclusive)"
    ),
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get statistics for a single client for the current user."""
    service = StatsService(db)
    return await service.get_single_client_stats(
        str(user_id), str(client_id), start_date, end_date, str(service_id)
    )


@router.get("/daily_breakdown", response_model=list[DailyBreakdownItem])
async def get_daily_breakdown(
    start_date: datetime = Query(
        ..., description="Start datetime (UTC, ISO 8601) for period (inclusive)"
    ),
    end_date: datetime = Query(
        ..., description="End datetime (UTC, ISO 8601) for period (inclusive)"
    ),
    service_id: UUID | None = Query(None),
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    """Get daily breakdown of revenue and meetings for the current user (UTC, excludes canceled)."""
    service = StatsService(db)
    return await service.get_daily_breakdown(user_id, start_date, end_date, service_id)
