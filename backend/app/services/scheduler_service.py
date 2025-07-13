import logging
from collections.abc import Callable
from datetime import datetime
from uuid import UUID

from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.api.commons.shared import ensure_utc
from app.config import settings

logger = logging.getLogger(__name__)


class SchedulerService:
    """Service for managing scheduled jobs for meeting status updates."""

    def __init__(self):
        self.scheduler: AsyncIOScheduler | None = None
        self._initialize_scheduler()

    def _initialize_scheduler(self):
        """Initialize the APScheduler with SQLite job store for persistence."""
        if not settings.enable_meeting_status_updates:
            logger.info("Meeting status updates are disabled")
            return

        try:
            jobstores = {
                "default": SQLAlchemyJobStore(url=settings.scheduler_jobstore_url)
            }

            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                timezone="UTC",
                job_defaults={"coalesce": False, "max_instances": 1},
            )
            logger.info("Scheduler initialized successfully")

            # Schedule daily membership status check
            self._schedule_daily_membership_check()

        except Exception as e:
            logger.error(f"Failed to initialize scheduler: {e}")
            self.scheduler = None

    def _schedule_daily_membership_check(self):
        """Schedule a daily job to check membership status updates."""
        if not self.scheduler:
            return

        job_id = "daily_membership_status_check"

        # Remove existing job if it exists
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

        # Schedule daily job at 2 AM UTC
        self.scheduler.add_job(
            func=check_membership_status_updates,
            trigger="cron",
            hour=2,
            minute=0,
            id=job_id,
            replace_existing=True,
        )

        logger.info("Scheduled daily membership status check at 2 AM UTC")

    async def start(self):
        """Start the scheduler."""
        if self.scheduler and not self.scheduler.running:
            self.scheduler.start()
            logger.info("Scheduler started successfully")

    async def shutdown(self):
        """Shutdown the scheduler."""
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Scheduler shutdown successfully")

    def schedule_meeting_status_update(
        self, func: Callable, meeting_id: UUID, end_time: datetime
    ):
        """Schedule a job to update meeting status when it ends."""
        if not self.scheduler or not settings.enable_meeting_status_updates:
            return

        job_id = f"meeting_status_update_{meeting_id}"

        # Remove existing job if it exists
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

        # Schedule new job
        self.scheduler.add_job(
            func=func,
            trigger="date",
            run_date=ensure_utc(end_time),
            id=job_id,
            args=[str(meeting_id)],
            replace_existing=True,
        )

        logger.info(f"Scheduled status update for meeting {meeting_id} at {end_time}")

    def cancel_meeting_status_update(self, meeting_id: UUID):
        """Cancel a scheduled meeting status update job."""
        if not self.scheduler:
            return

        job_id = f"meeting_status_update_{meeting_id}"
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            logger.info(f"Cancelled status update for meeting {meeting_id}")

    def get_scheduled_jobs(self):
        """Get all scheduled jobs for debugging."""
        if not self.scheduler:
            return []

        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "next_run_time": job.next_run_time,
                    "func": (
                        job.func.__name__
                        if hasattr(job.func, "__name__")
                        else str(job.func)
                    ),
                }
            )
        return jobs


async def check_membership_status_updates():
    """Standalone function to check and update membership statuses daily."""
    try:
        from app.api.memberships.service import MembershipService
        from app.database.session import get_db
        from app.models import User

        # Get a new database session
        db = next(get_db())

        # Get all users to check their memberships
        users = db.query(User).all()

        membership_service = MembershipService(db)
        updated_count = 0

        for user in users:
            try:
                await membership_service.update_membership_status(user.id)
                updated_count += 1
            except Exception as e:
                logger.error(f"Error updating memberships for user {user.id}: {e}")

        logger.info(
            f"Daily membership status check completed. Updated {updated_count} users."
        )

    except Exception as e:
        logger.error(f"Error in daily membership status check: {e}")
        if "db" in locals():
            db.rollback()
    finally:
        if "db" in locals():
            db.close()


# Global scheduler instance
scheduler_service = SchedulerService()
