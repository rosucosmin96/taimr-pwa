from datetime import datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.api.memberships.model import (
    MembershipCreateRequest,
    MembershipResponse,
    MembershipStatus,
    MembershipUpdateRequest,
)
from app.models import Meeting as MeetingModel
from app.models import Membership as MembershipModel


class MembershipService:
    def __init__(self, db: Session):
        self.db = db

    async def get_memberships(self, user_id: UUID) -> list[MembershipResponse]:
        """Get all memberships for a user."""
        memberships = (
            self.db.query(MembershipModel)
            .filter(MembershipModel.user_id == str(user_id))
            .all()
        )
        return [self._to_response(membership) for membership in memberships]

    async def create_membership(
        self, user_id: UUID, membership: MembershipCreateRequest
    ) -> MembershipResponse:
        """Create a new membership."""
        # Calculate price per meeting
        price_per_meeting = membership.price_per_membership / membership.total_meetings

        # Check if client already has an active membership
        existing_active = (
            self.db.query(MembershipModel)
            .filter(
                and_(
                    MembershipModel.user_id == str(user_id),
                    MembershipModel.client_id == str(membership.client_id),
                    MembershipModel.status == MembershipStatus.ACTIVE.value,
                )
            )
            .first()
        )

        if existing_active:
            raise ValueError("Client already has an active membership")

        db_membership = MembershipModel(
            id=str(uuid4()),
            user_id=str(user_id),
            service_id=str(membership.service_id),
            client_id=str(membership.client_id),
            name=membership.name,
            total_meetings=membership.total_meetings,
            price_per_membership=membership.price_per_membership,
            price_per_meeting=price_per_meeting,
            availability_days=membership.availability_days,
            status=MembershipStatus.ACTIVE.value,
            paid=False,
            start_date=None,  # Will be set when first meeting is created
        )

        self.db.add(db_membership)
        self.db.commit()
        self.db.refresh(db_membership)

        return self._to_response(db_membership)

    async def update_membership(
        self, user_id: UUID, membership_id: UUID, membership: MembershipUpdateRequest
    ) -> MembershipResponse:
        """Update an existing membership."""
        db_membership = (
            self.db.query(MembershipModel)
            .filter(
                and_(
                    MembershipModel.id == str(membership_id),
                    MembershipModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_membership:
            raise ValueError("Membership not found")

        # Update fields if provided
        if membership.name is not None:
            db_membership.name = membership.name
        if membership.total_meetings is not None:
            db_membership.total_meetings = membership.total_meetings
            # Recalculate price per meeting
            db_membership.price_per_meeting = (
                db_membership.price_per_membership / membership.total_meetings
            )
        if membership.price_per_membership is not None:
            db_membership.price_per_membership = membership.price_per_membership
            # Recalculate price per meeting
            db_membership.price_per_meeting = (
                membership.price_per_membership / db_membership.total_meetings
            )
        if membership.availability_days is not None:
            db_membership.availability_days = membership.availability_days
        if membership.status is not None:
            db_membership.status = membership.status.value
        if membership.paid is not None:
            db_membership.paid = membership.paid

        self.db.commit()
        self.db.refresh(db_membership)

        return self._to_response(db_membership)

    async def delete_membership(self, user_id: UUID, membership_id: UUID) -> None:
        """Delete a membership."""
        db_membership = (
            self.db.query(MembershipModel)
            .filter(
                and_(
                    MembershipModel.id == str(membership_id),
                    MembershipModel.user_id == str(user_id),
                )
            )
            .first()
        )

        if not db_membership:
            raise ValueError("Membership not found")

        # Cancel the membership instead of deleting
        db_membership.status = MembershipStatus.CANCELED.value
        self.db.commit()

    async def get_active_membership(
        self, user_id: UUID, client_id: UUID
    ) -> MembershipResponse | None:
        """Get the active membership for a client."""
        db_membership = (
            self.db.query(MembershipModel)
            .filter(
                and_(
                    MembershipModel.user_id == str(user_id),
                    MembershipModel.client_id == str(client_id),
                    MembershipModel.status == MembershipStatus.ACTIVE.value,
                )
            )
            .first()
        )

        if not db_membership:
            return None

        return self._to_response(db_membership)

    async def get_membership_meetings(
        self, user_id: UUID, membership_id: UUID
    ) -> list[dict]:
        """Get all meetings for a membership."""
        meetings = (
            self.db.query(MeetingModel)
            .filter(
                and_(
                    MeetingModel.user_id == str(user_id),
                    MeetingModel.membership_id == str(membership_id),
                )
            )
            .all()
        )

        return [
            {
                "id": meeting.id,
                "title": meeting.title,
                "start_time": meeting.start_time,
                "end_time": meeting.end_time,
                "status": meeting.status,
                "paid": meeting.paid,
            }
            for meeting in meetings
        ]

    async def update_membership_status(self, user_id: UUID) -> None:
        """Update membership status based on expiration rules."""
        memberships = (
            self.db.query(MembershipModel)
            .filter(
                and_(
                    MembershipModel.user_id == str(user_id),
                    MembershipModel.status == MembershipStatus.ACTIVE.value,
                )
            )
            .all()
        )

        for membership in memberships:
            should_expire = False

            # Check time-based expiration
            if membership.start_date:
                expiration_date = membership.start_date + timedelta(
                    days=membership.availability_days
                )
                if datetime.now() > expiration_date:
                    should_expire = True

            # Check meeting count-based expiration
            if not should_expire:
                done_meetings_count = (
                    self.db.query(MeetingModel)
                    .filter(
                        and_(
                            MeetingModel.membership_id == membership.id,
                            MeetingModel.status == "done",
                        )
                    )
                    .count()
                )

                if done_meetings_count >= membership.total_meetings:
                    should_expire = True

            if should_expire:
                membership.status = MembershipStatus.EXPIRED.value

        self.db.commit()

    async def set_membership_start_date(
        self, membership_id: UUID, start_date: datetime
    ) -> None:
        """Set the start date of a membership when the first meeting is created."""
        db_membership = (
            self.db.query(MembershipModel)
            .filter(MembershipModel.id == str(membership_id))
            .first()
        )

        if db_membership and not db_membership.start_date:
            db_membership.start_date = start_date
            self.db.commit()

    def _to_response(self, membership: MembershipModel) -> MembershipResponse:
        """Convert database model to response model."""
        return MembershipResponse(
            id=UUID(membership.id),
            user_id=UUID(membership.user_id),
            service_id=UUID(membership.service_id),
            client_id=UUID(membership.client_id),
            name=membership.name,
            total_meetings=membership.total_meetings,
            price_per_membership=membership.price_per_membership,
            price_per_meeting=membership.price_per_meeting,
            availability_days=membership.availability_days,
            status=MembershipStatus(membership.status),
            paid=membership.paid,
            start_date=membership.start_date,
            created_at=membership.created_at,
        )
