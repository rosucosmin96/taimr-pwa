from collections import defaultdict
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.api.commons.shared import ensure_utc
from app.api.meetings.model import MeetingResponse
from app.api.stats.model import (
    ClientStats,
    ClientStatsResponse,
    DailyBreakdownItem,
    StatsOverview,
)
from app.models import Client as ClientModel
from app.models import Meeting as MeetingModel
from app.models import Membership as MembershipModel
from app.models.meeting import MeetingStatus
from app.storage.factory import StorageFactory


class StatsService:
    def __init__(self):
        self.meeting_storage = StorageFactory.create_storage_service(
            model_class=MeetingModel,
            response_class=None,  # We'll handle responses manually
            table_name="meetings",
        )
        self.client_storage = StorageFactory.create_storage_service(
            model_class=ClientModel,
            response_class=None,  # We'll handle responses manually
            table_name="clients",
        )
        self.membership_storage = StorageFactory.create_storage_service(
            model_class=MembershipModel,
            response_class=None,  # We'll handle responses manually
            table_name="memberships",
        )

    async def get_overview(
        self,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        service_id: UUID | None = None,
    ) -> StatsOverview:
        """Get overview statistics for a user (all calculations in Python)"""
        # Get all meetings for the user
        meeting_filters = {}
        if start_date:
            meeting_filters["start_time"] = {"gte": ensure_utc(start_date)}
        if end_date:
            meeting_filters["start_time"] = meeting_filters.get("start_time", {})
            meeting_filters["start_time"]["lte"] = ensure_utc(end_date)
        if service_id:
            meeting_filters["service_id"] = str(service_id)

        meetings = await self.meeting_storage.get_all(user_id, meeting_filters)

        total_meetings = len(meetings)
        done_meetings = len(
            [m for m in meetings if m["status"] == MeetingStatus.DONE.value]
        )
        canceled_meetings = len(
            [m for m in meetings if m["status"] == MeetingStatus.CANCELED.value]
        )
        client_ids = {m["client_id"] for m in meetings}
        total_clients = len(client_ids)
        total_revenue = sum(
            float(m["price_total"])
            for m in meetings
            if m["status"] == MeetingStatus.DONE.value
        )
        total_hours = sum(
            (m["end_time"] - m["start_time"]).total_seconds() / 3600
            for m in meetings
            if m["status"] == MeetingStatus.DONE.value
        )

        # Revenue paid: sum of price_total for meetings that are done and paid
        revenue_paid = sum(
            float(m["price_total"])
            for m in meetings
            if m["status"] == MeetingStatus.DONE.value and m["paid"]
        )

        # Membership statistics
        membership_filters = {}
        if service_id:
            membership_filters["service_id"] = str(service_id)

        memberships = await self.membership_storage.get_all(user_id, membership_filters)

        total_memberships = len(memberships)
        active_memberships = len([m for m in memberships if m["status"] == "active"])
        membership_revenue = sum(float(m["price_per_membership"]) for m in memberships)
        membership_revenue_paid = sum(
            float(m["price_per_membership"]) for m in memberships if m["paid"]
        )
        clients_with_memberships = len({m["client_id"] for m in memberships})

        return StatsOverview(
            total_meetings=total_meetings,
            done_meetings=done_meetings,
            canceled_meetings=canceled_meetings,
            total_clients=total_clients,
            total_revenue=total_revenue,
            total_hours=total_hours,
            total_memberships=total_memberships,
            active_memberships=active_memberships,
            membership_revenue=membership_revenue,
            membership_revenue_paid=membership_revenue_paid,
            clients_with_memberships=clients_with_memberships,
            revenue_paid=revenue_paid,
        )

    async def get_client_stats(
        self,
        user_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        service_id: UUID | None = None,
    ) -> list[ClientStatsResponse]:
        """Get client statistics for a user (all calculations in Python)"""
        # Get all clients for the user
        client_filters = {}
        if service_id:
            client_filters["service_id"] = str(service_id)

        clients = await self.client_storage.get_all(user_id, client_filters)
        client_stats = []

        for client in clients:
            # Get meetings for this client
            meeting_filters = {"client_id": str(client["id"])}
            if start_date:
                meeting_filters["start_time"] = {"gte": ensure_utc(start_date)}
            if end_date:
                meeting_filters["start_time"] = meeting_filters.get("start_time", {})
                meeting_filters["start_time"]["lte"] = ensure_utc(end_date)

            meetings = await self.meeting_storage.get_all(user_id, meeting_filters)

            if not meetings:
                continue

            total_meetings = len(meetings)
            done_meetings = len(
                [m for m in meetings if m["status"] == MeetingStatus.DONE.value]
            )
            canceled_meetings = len(
                [m for m in meetings if m["status"] == MeetingStatus.CANCELED.value]
            )
            total_revenue = sum(
                float(m["price_total"])
                for m in meetings
                if m["status"] == MeetingStatus.DONE.value
            )
            total_hours = sum(
                (m["end_time"] - m["start_time"]).total_seconds() / 3600
                for m in meetings
                if m["status"] == MeetingStatus.DONE.value
            )
            last_meeting = (
                max(meetings, key=lambda m: m["start_time"]) if meetings else None
            )

            client_stat = ClientStats(
                client_id=client["id"],
                client_name=client["name"],
                total_meetings=total_meetings,
                done_meetings=done_meetings,
                canceled_meetings=canceled_meetings,
                total_revenue=total_revenue,
                total_hours=total_hours,
                last_meeting=(
                    ensure_utc(last_meeting["start_time"]) if last_meeting else None
                ),
            )
            client_stats.append(
                ClientStatsResponse(
                    client_stats=client_stat,
                    meetings=[MeetingResponse.model_validate(m) for m in meetings],
                )
            )
        return client_stats

    async def get_single_client_stats(
        self,
        user_id: str,
        client_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        service_id: str = None,
    ):
        """Get statistics for a single client"""
        # Query the client
        clients = await self.client_storage.get_all(UUID(user_id), {"id": client_id})
        if not clients:
            raise Exception("Client not found")

        client = clients[0]

        # Query meetings for this client in the period
        meeting_filters = {"client_id": client_id}
        if start_date:
            meeting_filters["start_time"] = {"gte": ensure_utc(start_date)}
        if end_date:
            meeting_filters["start_time"] = meeting_filters.get("start_time", {})
            meeting_filters["start_time"]["lte"] = ensure_utc(end_date)

        meetings = await self.meeting_storage.get_all(UUID(user_id), meeting_filters)

        # Compute stats
        total_meetings = len(meetings)
        done_meetings = sum(1 for m in meetings if m["status"] == "done")
        canceled_meetings = sum(1 for m in meetings if m["status"] == "canceled")
        total_revenue = sum(m["price_total"] for m in meetings)
        total_hours = sum(
            (m["end_time"] - m["start_time"]).total_seconds() / 3600 for m in meetings
        )
        last_meeting = (
            max(meetings, key=lambda m: m["start_time"]) if meetings else None
        )

        client_stats = ClientStats(
            client_id=client["id"],
            client_name=client["name"],
            total_meetings=total_meetings,
            done_meetings=done_meetings,
            canceled_meetings=canceled_meetings,
            total_revenue=total_revenue,
            total_hours=total_hours,
            last_meeting=(
                ensure_utc(last_meeting["start_time"]) if last_meeting else None
            ),
        )

        return ClientStatsResponse(
            client_stats=client_stats,
            meetings=[MeetingResponse.model_validate(m) for m in meetings],
        )

    async def get_daily_breakdown(
        self,
        user_id: UUID,
        start_date: datetime,
        end_date: datetime,
        service_id: UUID | None = None,
    ) -> list[DailyBreakdownItem]:
        """Get daily breakdown of revenue and meetings for a user (all calculations in Python)"""
        # Get meetings in the date range
        meeting_filters = {
            "start_time": {"gte": ensure_utc(start_date), "lte": ensure_utc(end_date)},
            "status": [MeetingStatus.DONE.value, MeetingStatus.UPCOMING.value],
        }
        if service_id:
            meeting_filters["service_id"] = str(service_id)

        meetings = await self.meeting_storage.get_all(user_id, meeting_filters)

        # Group by day (UTC)
        day_map = defaultdict(lambda: {"revenue": 0.0, "meeting_ids": []})
        for m in meetings:
            day = m["start_time"].astimezone(UTC).date().isoformat()
            if m["status"] == MeetingStatus.DONE.value:
                day_map[day]["revenue"] += float(m["price_total"])
            day_map[day]["meeting_ids"].append(str(m["id"]))

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
