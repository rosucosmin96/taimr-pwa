"""
Test data initialization module for development environment.
This module provides functions to create test data safely.
"""

import logging
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy.orm import Session

from app.api.commons.shared import ensure_utc
from app.models.meeting import MeetingStatus

from ..models import Client, Meeting, Membership, Notification, Service, User
from .factory import DatabaseFactory

logger = logging.getLogger(__name__)


def create_test_user(session: Session) -> User:
    """Create a test user if it doesn't exist."""
    user_id = "00000000-0000-0000-0000-000000000000"  # Mock user ID from auth

    # Check if user already exists
    existing_user = session.query(User).filter(User.id == user_id).first()
    if existing_user:
        logger.info("Test user already exists")
        return existing_user

    user = User(
        id=user_id, email="test@example.com", name="Test User", profile_picture_url=None
    )
    session.add(user)
    session.commit()
    logger.info("✅ Created test user")
    return user


def create_test_services(session: Session, user_id: str) -> list[Service]:
    """Create test services if they don't exist."""
    # Check if services already exist
    existing_services = session.query(Service).filter(Service.user_id == user_id).all()
    if existing_services:
        logger.info(f"Found {len(existing_services)} existing test services")
        return existing_services

    services = [
        Service(
            id=str(uuid4()),
            user_id=user_id,
            name="Web Development",
            default_duration_minutes=120,
            default_price_per_hour=75.0,
        ),
        Service(
            id=str(uuid4()),
            user_id=user_id,
            name="Graphic Design",
            default_duration_minutes=90,
            default_price_per_hour=60.0,
        ),
        Service(
            id=str(uuid4()),
            user_id=user_id,
            name="Consulting",
            default_duration_minutes=60,
            default_price_per_hour=100.0,
        ),
    ]

    for service in services:
        session.add(service)
    session.commit()
    logger.info("✅ Created test services")
    return services


def create_test_clients(
    session: Session, user_id: str, services: list[Service]
) -> list[Client]:
    """Create test clients if they don't exist."""
    # Check if clients already exist
    existing_clients = session.query(Client).filter(Client.user_id == user_id).all()
    if existing_clients:
        logger.info(f"Found {len(existing_clients)} existing test clients")
        return existing_clients

    clients = [
        Client(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[0].id,  # Web Development
            name="John Smith",
            email="john.smith@email.com",
            phone="+1-555-0123",
            custom_duration_minutes=120,
            custom_price_per_hour=80.0,
        ),
        Client(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[1].id,  # Graphic Design
            name="Sarah Johnson",
            email="sarah.j@company.com",
            phone="+1-555-0456",
            custom_duration_minutes=None,
            custom_price_per_hour=None,
        ),
        Client(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[2].id,  # Consulting
            name="Mike Wilson",
            email="mike.wilson@startup.io",
            phone="+1-555-0789",
            custom_duration_minutes=90,
            custom_price_per_hour=110.0,
        ),
    ]

    for client in clients:
        session.add(client)
    session.commit()
    logger.info("✅ Created test clients")
    return clients


def create_test_meetings(
    session: Session,
    user_id: str,
    services: list[Service],
    clients: list[Client],
    memberships: list[Membership],
) -> list[Meeting]:
    """Create test meetings if they don't exist."""
    # Check if meetings already exist
    existing_meetings = session.query(Meeting).filter(Meeting.user_id == user_id).all()
    if existing_meetings:
        logger.info(f"Found {len(existing_meetings)} existing test meetings")
        return existing_meetings

    # Use UTC date for 'today'
    today = datetime.now(UTC).date()
    meetings = [
        Meeting(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[0].id,
            client_id=clients[0].id,
            title="Website Consultation",
            recurrence_id=None,
            membership_id=memberships[0].id,  # John's membership
            start_time=ensure_utc(
                datetime.combine(today, datetime.min.time().replace(hour=9))
            ),
            end_time=ensure_utc(
                datetime.combine(today, datetime.min.time().replace(hour=11))
            ),
            price_per_hour=80.0,
            price_total=160.0,
            status=MeetingStatus.DONE.value,
            paid=True,
        ),
        Meeting(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[1].id,
            client_id=clients[1].id,
            title="Logo Design",
            recurrence_id=None,
            membership_id=memberships[1].id,  # Sarah's membership
            start_time=ensure_utc(
                datetime.combine(
                    today + timedelta(days=1), datetime.min.time().replace(hour=14)
                )
            ),
            end_time=ensure_utc(
                datetime.combine(
                    today + timedelta(days=1),
                    datetime.min.time().replace(hour=15, minute=30),
                )
            ),
            price_per_hour=60.0,
            price_total=90.0,
            status=MeetingStatus.UPCOMING.value,
            paid=False,
        ),
        Meeting(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[2].id,
            client_id=clients[2].id,
            title="Business Strategy",
            recurrence_id=None,
            membership_id=None,  # No membership for this meeting
            start_time=ensure_utc(
                datetime.combine(
                    today + timedelta(days=2), datetime.min.time().replace(hour=10)
                )
            ),
            end_time=ensure_utc(
                datetime.combine(
                    today + timedelta(days=2), datetime.min.time().replace(hour=11)
                )
            ),
            price_per_hour=110.0,
            price_total=110.0,
            status=MeetingStatus.UPCOMING.value,
            paid=False,
        ),
    ]

    for meeting in meetings:
        session.add(meeting)
    session.commit()
    logger.info("✅ Created test meetings")
    return meetings


def create_test_memberships(
    session: Session, user_id: str, services: list[Service], clients: list[Client]
) -> list[Membership]:
    """Create test memberships if they don't exist."""
    # Check if memberships already exist
    existing_memberships = (
        session.query(Membership).filter(Membership.user_id == user_id).all()
    )
    if existing_memberships:
        logger.info(f"Found {len(existing_memberships)} existing test memberships")
        return existing_memberships

    memberships = [
        Membership(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[0].id,  # Web Development
            client_id=clients[0].id,  # John Smith
            name="John's Web Development Package",
            total_meetings=10,
            price_per_membership=800.0,
            price_per_meeting=80.0,
            availability_days=90,
            status="active",
            paid=True,
            start_date=ensure_utc(datetime.now(UTC) - timedelta(days=30)),
        ),
        Membership(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[1].id,  # Graphic Design
            client_id=clients[1].id,  # Sarah Johnson
            name="Sarah's Design Package",
            total_meetings=5,
            price_per_membership=300.0,
            price_per_meeting=60.0,
            availability_days=60,
            status="active",
            paid=False,
            start_date=ensure_utc(datetime.now(UTC) - timedelta(days=15)),
        ),
        Membership(
            id=str(uuid4()),
            user_id=user_id,
            service_id=services[2].id,  # Consulting
            client_id=clients[2].id,  # Mike Wilson
            name="Mike's Consulting Package",
            total_meetings=8,
            price_per_membership=880.0,
            price_per_meeting=110.0,
            availability_days=120,
            status="expired",
            paid=True,
            start_date=ensure_utc(datetime.now(UTC) - timedelta(days=150)),
        ),
    ]

    for membership in memberships:
        session.add(membership)
    session.commit()
    logger.info("✅ Created test memberships")
    return memberships


def create_test_notifications(
    session: Session, user_id: str, memberships: list[Membership]
) -> list[Notification]:
    """Create test notifications if they don't exist."""
    # Check if notifications already exist
    existing_notifications = (
        session.query(Notification).filter(Notification.user_id == user_id).all()
    )
    if existing_notifications:
        logger.info(f"Found {len(existing_notifications)} existing test notifications")
        return existing_notifications

    notifications = [
        Notification(
            id=str(uuid4()),
            user_id=user_id,
            type="membership_expiring",
            title="Membership Expiring Soon",
            message=f"'{memberships[0].name}' for John Smith expires in 5 days.",
            related_entity_id=memberships[0].id,
            related_entity_type="membership",
            read=False,
            read_at=None,
            created_at=ensure_utc(datetime.now(UTC) - timedelta(days=5)),
        ),
        Notification(
            id=str(uuid4()),
            user_id=user_id,
            type="membership_expired",
            title="Membership Expired",
            message=f"'{memberships[2].name}' for Mike Wilson has expired.",
            related_entity_id=memberships[2].id,
            related_entity_type="membership",
            read=False,
            read_at=None,
            created_at=ensure_utc(datetime.now(UTC) - timedelta(days=1)),
        ),
        Notification(
            id=str(uuid4()),
            user_id=user_id,
            type="meeting_reminder",
            title="Upcoming Meeting Reminder",
            message="You have a meeting with Sarah Johnson tomorrow at 2:00 PM.",
            related_entity_id=memberships[1].id,
            related_entity_type="membership",
            read=False,
            read_at=None,
            created_at=ensure_utc(datetime.now(UTC)),
        ),
    ]

    for notification in notifications:
        session.add(notification)
    session.commit()
    logger.info("✅ Created test notifications")
    return notifications


def init_test_data() -> bool:
    """
    Initialize database with test data safely.

    Returns:
        bool: True if test data was created or already exists, False if error occurred
    """
    try:
        logger.info("Initializing test data...")

        # Get database provider and create tables
        db_provider = DatabaseFactory.get_current_provider()
        db_provider.create_tables()

        session = db_provider.get_session()

        try:
            # Create test user
            user = create_test_user(session)

            # Create test services
            services = create_test_services(session, user.id)

            # Create test clients
            clients = create_test_clients(session, user.id, services)

            # Create test memberships
            memberships = create_test_memberships(session, user.id, services, clients)

            # Create test notifications
            create_test_notifications(session, user.id, memberships)

            # Create test meetings
            meetings = create_test_meetings(
                session, user.id, services, clients, memberships
            )

            logger.info("🎉 Test data initialization completed successfully!")
            logger.info(f"Database URL: {db_provider.get_url()}")
            logger.info(
                f"Test data summary: 1 user, {len(services)} services, {len(clients)} clients, {len(meetings)} meetings, {len(memberships)} memberships"
            )

            return True

        except Exception as e:
            logger.error(f"❌ Error during test data initialization: {e}")
            session.rollback()
            return False
        finally:
            session.close()

    except Exception as e:
        logger.error(f"❌ Error initializing test data: {e}")
        return False
