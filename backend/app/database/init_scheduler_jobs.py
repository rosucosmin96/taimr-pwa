import logging
from datetime import UTC, datetime
from uuid import UUID

from app.api.meetings.model import MeetingStatus
from app.database.session import get_db
from app.models import Meeting as MeetingModel
from app.services.scheduler_service import scheduler_service

logger = logging.getLogger(__name__)


def init_scheduler_jobs():
    """Initialize scheduled jobs for existing upcoming meetings."""
    try:
        # Check if scheduler is available
        if not scheduler_service.scheduler:
            logger.warning("Scheduler not available, skipping job initialization")
            return False

        db = next(get_db())

        # Get all upcoming meetings that haven't ended yet
        now = datetime.now(UTC)
        upcoming_meetings = (
            db.query(MeetingModel)
            .filter(
                MeetingModel.status == MeetingStatus.UPCOMING.value,
                MeetingModel.end_time > now,
            )
            .all()
        )

        logger.info(f"Found {len(upcoming_meetings)} upcoming meetings to schedule")

        for meeting in upcoming_meetings:
            try:
                scheduler_service.schedule_meeting_status_update(
                    UUID(meeting.id), meeting.end_time
                )
                logger.info(
                    f"Scheduled status update for meeting {meeting.id} at {meeting.end_time}"
                )
            except Exception as e:
                logger.error(f"Failed to schedule job for meeting {meeting.id}: {e}")

        logger.info("Scheduler jobs initialization completed")
        return True

    except Exception as e:
        logger.error(f"Error initializing scheduler jobs: {e}")
        return False
    finally:
        if "db" in locals():
            db.close()


if __name__ == "__main__":
    init_scheduler_jobs()
