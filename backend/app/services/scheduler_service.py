import logging
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
        """Initialize the APScheduler with appropriate job store."""
        if not settings.enable_meeting_status_updates:
            logger.info("Meeting status updates are disabled")
            return

        try:
            # Use SQLite for development, Supabase for production
            if settings.environment == "dev":
                jobstore_url = settings.scheduler_jobstore_url
            else:
                # For production, use SQLite in memory since Supabase doesn't support direct PostgreSQL connections
                jobstore_url = "sqlite:///:memory:"
                logger.info("Using in-memory SQLite for scheduler jobs in production")

            jobstores = {"default": SQLAlchemyJobStore(url=jobstore_url)}

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

    def schedule_meeting_status_update(self, meeting_id: UUID, end_time: datetime):
        """Schedule a job to update meeting status when it ends."""
        if not self.scheduler or not settings.enable_meeting_status_updates:
            return

        job_id = f"meeting_status_update_{meeting_id}"

        # Remove existing job if it exists
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)

        # Schedule new job
        self.scheduler.add_job(
            func=update_meeting_status,
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


def update_meeting_status(meeting_id: str):
    """Standalone function to update meeting status from 'upcoming' to 'done' when meeting ends."""
    try:
        if settings.environment == "dev":
            # Use SQLite for development - direct database access for scheduler
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            from app.api.meetings.model import MeetingStatus
            from app.models import Meeting as MeetingModel

            engine = create_engine(f"sqlite:///{settings.database_path}")
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = SessionLocal()

            meeting = (
                db.query(MeetingModel).filter(MeetingModel.id == meeting_id).first()
            )

            if not meeting:
                logger.warning(f"Meeting {meeting_id} not found for status update")
                db.close()
                return

            if meeting.status == MeetingStatus.UPCOMING.value:
                meeting.status = MeetingStatus.DONE.value
                db.commit()
                logger.info(f"Updated meeting {meeting_id} status to 'done'")
            else:
                logger.info(
                    f"Meeting {meeting_id} status is already '{meeting.status}', skipping update"
                )

            db.close()
        else:
            # Use Supabase SDK for production - direct access for scheduler
            from supabase import create_client

            supabase_client = create_client(
                settings.supabase_url, settings.supabase_service_role_key
            )

            # Get the meeting from Supabase
            response = (
                supabase_client.table("meetings")
                .select("*")
                .eq("id", meeting_id)
                .execute()
            )
            meeting_data = response.data[0] if response.data else None

            if not meeting_data:
                logger.warning(f"Meeting {meeting_id} not found for status update")
                return

            if meeting_data.get("status") == "upcoming":
                # Update the meeting status
                result = (
                    supabase_client.table("meetings")
                    .update({"status": "done"})
                    .eq("id", meeting_id)
                    .execute()
                )
                if result.data:
                    logger.info(f"Updated meeting {meeting_id} status to 'done'")
                else:
                    logger.error(f"Failed to update meeting {meeting_id} status")
            else:
                logger.info(
                    f"Meeting {meeting_id} status is already '{meeting_data.get('status')}', skipping update"
                )

    except Exception as e:
        logger.error(f"Error updating meeting {meeting_id} status: {e}")


async def check_membership_status_updates():
    """Standalone function to check and update membership statuses daily."""
    try:
        # Use MembershipService without database session
        from app.api.memberships.service import MembershipService

        # Create membership service without database session
        membership_service = MembershipService()

        # Get all users from the database
        if settings.environment == "dev":
            # Use SQLite for development
            from sqlalchemy import create_engine
            from sqlalchemy.orm import sessionmaker

            from app.models import User as UserModel

            engine = create_engine(f"sqlite:///{settings.database_path}")
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            db = SessionLocal()

            users = db.query(UserModel).all()
            user_ids = [user.id for user in users]
            db.close()
        else:
            # Use Supabase SDK for production
            from supabase import create_client

            supabase_client = create_client(
                settings.supabase_url, settings.supabase_service_role_key
            )

            # Get all users from Supabase
            response = supabase_client.table("users").select("id").execute()
            user_ids = [user["id"] for user in response.data]

        # Update membership statuses for each user
        updated_count = 0
        for user_id in user_ids:
            try:
                await membership_service.update_membership_status(user_id)
                updated_count += 1
                logger.info(f"Updated membership statuses for user {user_id}")
            except Exception as e:
                logger.error(
                    f"Failed to update membership statuses for user {user_id}: {e}"
                )
                continue

        logger.info(
            f"Daily membership status check completed. Updated {updated_count}/{len(user_ids)} users."
        )

    except Exception as e:
        logger.error(f"Error in daily membership status check: {e}")


# Global scheduler instance
scheduler_service = SchedulerService()
