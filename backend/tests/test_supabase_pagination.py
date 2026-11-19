from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import Mock
from uuid import UUID, uuid4

import pytest

from app.storage.supabase_service import SupabaseService


def capped_client(records, cap):
    """Emulate filtered, ordered PostgREST responses with a per-request cap."""
    client = Mock()
    query = client.table.return_value
    for method in ("select", "eq", "order", "range"):
        getattr(query, method).return_value = query

    def execute():
        rows = list(records)
        for call in query.eq.call_args_list:
            key, value = call.args
            rows = [row for row in rows if row[key] == value]
        for call in reversed(query.order.call_args_list):
            rows.sort(key=lambda row: row[call.args[0]])
        start, end = query.range.call_args.args
        return SimpleNamespace(data=rows[start : min(end + 1, start + cap)])

    query.execute.side_effect = execute
    return client, query


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("count", "cap"),
    [(0, 1000), (2, 1000), (1000, 1000), (1002, 1000), (2000, 1000), (1002, 100)],
)
async def test_get_all_reads_past_response_cap(count, cap):
    user_id = uuid4()
    records = [
        {
            "id": str(UUID(int=index + 1)),
            "user_id": str(user_id),
            # Reproduce the November 20 cutoff and two missing meetings.
            "start_time": (
                "2026-11-20T08:00:00+00:00"
                if index < 1000
                else "2026-11-21T07:00:00+00:00"
            ),
            "status": "upcoming",
        }
        for index in range(count)
    ]
    other_user_record = {"id": str(uuid4()), "user_id": str(uuid4())}
    canceled_record = {
        **(records[0] if records else {}),
        "id": str(uuid4()),
        "user_id": str(user_id),
        "status": "canceled",
    }
    client, query = capped_client(
        [other_user_record, canceled_record, *reversed(records)], cap
    )
    storage = SupabaseService(client, "meetings", None)

    meetings = await storage.get_all(
        user_id, {"status": "upcoming"}, order_by="start_time"
    )

    assert [meeting["id"] for meeting in meetings] == [
        UUID(record["id"]) for record in records
    ]
    if count == 1002:
        assert all(
            meeting["start_time"] == datetime(2026, 11, 21, 7, tzinfo=UTC)
            for meeting in meetings[-2:]
        )
    assert [call.args for call in query.order.call_args_list] == [
        ("start_time",),
        ("id",),
    ]
    assert query.execute.call_count == (count + cap - 1) // cap + 1


@pytest.mark.asyncio
@pytest.mark.parametrize("order_by", [None, "id"])
async def test_users_pagination_orders_by_id_without_user_id_filter(order_by):
    records = [{"id": str(UUID(int=index))} for index in (3, 1, 2)]
    client, query = capped_client(records, cap=2)
    storage = SupabaseService(client, "users", None)

    users = await storage.get_all(uuid4(), order_by=order_by)

    assert [user["id"].int for user in users] == [1, 2, 3]
    query.eq.assert_not_called()
    query.order.assert_called_once_with("id", desc=False)
