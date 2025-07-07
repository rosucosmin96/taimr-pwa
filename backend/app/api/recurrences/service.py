from datetime import datetime
from uuid import UUID, uuid4

from app.api.recurrences.model import (
    RecurrenceCreateRequest,
    RecurrenceFrequency,
    RecurrenceResponse,
    RecurrenceUpdateRequest,
)


class RecurrenceService:
    def __init__(self):
        # Mock data
        self.mock_recurrences = [
            RecurrenceResponse(
                id=UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("11111111-1111-1111-1111-111111111111"),
                client_id=UUID("44444444-4444-4444-4444-444444444444"),
                frequency=RecurrenceFrequency.WEEKLY,
                start_date=datetime(2024, 3, 1, 14, 0, 0),
                end_date=datetime(2024, 6, 30, 14, 0, 0),
                created_at=datetime(2024, 2, 25, 10, 0, 0),
            ),
            RecurrenceResponse(
                id=UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
                user_id=UUID("00000000-0000-0000-0000-000000000000"),
                service_id=UUID("22222222-2222-2222-2222-222222222222"),
                client_id=UUID("55555555-5555-5555-5555-555555555555"),
                frequency=RecurrenceFrequency.BIWEEKLY,
                start_date=datetime(2024, 3, 5, 10, 0, 0),
                end_date=datetime(2024, 8, 31, 10, 0, 0),
                created_at=datetime(2024, 3, 1, 9, 0, 0),
            ),
        ]

    async def create_recurrence(
        self, user_id: UUID, recurrence: RecurrenceCreateRequest
    ) -> RecurrenceResponse:
        """Create a new recurrence and generate future meetings"""
        new_recurrence = RecurrenceResponse(
            id=uuid4(),
            user_id=user_id,
            service_id=recurrence.service_id,
            client_id=recurrence.client_id,
            frequency=recurrence.frequency,
            start_date=recurrence.start_date,
            end_date=recurrence.end_date,
            created_at=datetime.now(),
        )
        self.mock_recurrences.append(new_recurrence)
        return new_recurrence

    async def update_recurrence(
        self, user_id: UUID, recurrence_id: UUID, recurrence: RecurrenceUpdateRequest
    ) -> RecurrenceResponse:
        """Update a recurrence and apply changes to all future meetings"""
        for existing_recurrence in self.mock_recurrences:
            if existing_recurrence.id == recurrence_id:
                if recurrence.service_id is not None:
                    existing_recurrence.service_id = recurrence.service_id
                if recurrence.client_id is not None:
                    existing_recurrence.client_id = recurrence.client_id
                if recurrence.frequency is not None:
                    existing_recurrence.frequency = recurrence.frequency
                if recurrence.start_date is not None:
                    existing_recurrence.start_date = recurrence.start_date
                if recurrence.end_date is not None:
                    existing_recurrence.end_date = recurrence.end_date
                return existing_recurrence
        raise ValueError("Recurrence not found")

    async def delete_recurrence(self, user_id: UUID, recurrence_id: UUID) -> bool:
        """Delete a recurrence and all associated future meetings"""
        for i, recurrence in enumerate(self.mock_recurrences):
            if recurrence.id == recurrence_id:
                del self.mock_recurrences[i]
                return True
        return False
