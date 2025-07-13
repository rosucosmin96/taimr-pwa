from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.services.scheduler_service import SchedulerService


class TestSchedulerService:
    """Test cases for the scheduler service."""

    def test_scheduler_initialization(self):
        """Test that scheduler initializes correctly."""
        scheduler = SchedulerService()
        assert scheduler.scheduler is not None

    def test_schedule_meeting_status_update(self):
        """Test scheduling a meeting status update."""
        scheduler = SchedulerService()
        meeting_id = uuid4()
        end_time = datetime.now(UTC) + timedelta(hours=1)

        # Schedule the job
        scheduler.schedule_meeting_status_update(meeting_id, end_time)

        # Check that job was scheduled
        job_id = f"meeting_status_update_{meeting_id}"
        job = scheduler.scheduler.get_job(job_id)
        assert job is not None
        assert job.next_run_time == end_time

    def test_cancel_meeting_status_update(self):
        """Test canceling a meeting status update."""
        scheduler = SchedulerService()
        meeting_id = uuid4()
        end_time = datetime.now(UTC) + timedelta(hours=1)

        # Schedule the job
        scheduler.schedule_meeting_status_update(meeting_id, end_time)

        # Cancel the job
        scheduler.cancel_meeting_status_update(meeting_id)

        # Check that job was removed
        job_id = f"meeting_status_update_{meeting_id}"
        job = scheduler.scheduler.get_job(job_id)
        assert job is None

    def test_get_scheduled_jobs(self):
        """Test getting scheduled jobs."""
        scheduler = SchedulerService()
        meeting_id = uuid4()
        end_time = datetime.now(UTC) + timedelta(hours=1)

        # Schedule a job
        scheduler.schedule_meeting_status_update(meeting_id, end_time)

        # Get all jobs
        jobs = scheduler.get_scheduled_jobs()
        assert len(jobs) == 1
        assert jobs[0]["id"] == f"meeting_status_update_{meeting_id}"

    def test_update_existing_job(self):
        """Test updating an existing scheduled job."""
        scheduler = SchedulerService()
        meeting_id = uuid4()
        end_time1 = datetime.now(UTC) + timedelta(hours=1)
        end_time2 = datetime.now(UTC) + timedelta(hours=2)

        # Schedule initial job
        scheduler.schedule_meeting_status_update(meeting_id, end_time1)

        # Update the job with new time
        scheduler.schedule_meeting_status_update(meeting_id, end_time2)

        # Check that job was updated
        job_id = f"meeting_status_update_{meeting_id}"
        job = scheduler.scheduler.get_job(job_id)
        assert job is not None
        assert job.next_run_time == end_time2

        # Check that only one job exists
        jobs = scheduler.get_scheduled_jobs()
        assert len(jobs) == 1
