import base64
import codecs
import json
import logging
from datetime import datetime
from uuid import UUID

from apscheduler.job import Job
from apscheduler.jobstores.base import BaseJobStore
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.api.commons.shared import ensure_utc
from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseJobStore(BaseJobStore):
    """Custom job store that uses Supabase for storing scheduled jobs."""

    def __init__(self, supabase_client, table_name="scheduler_jobs"):
        super().__init__()
        self.supabase = supabase_client
        self.table_name = table_name
        self._scheduler = None

    def start(self, scheduler, alias):
        """Start the job store."""
        super().start(scheduler, alias)
        self._scheduler = scheduler

    def _decode_job_state(self, job_state_raw, job_id=None):
        """Decode job state from Supabase BYTEA format with improved error handling."""
        try:
            # Convert Supabase BYTEA format to bytes
            if (
                isinstance(job_state_raw, dict)
                and job_state_raw.get("type") == "Buffer"
            ):
                # Supabase returns BYTEA as {"type": "Buffer", "data": [...]}
                job_state_bytes = bytes(job_state_raw["data"])
            elif isinstance(job_state_raw, str):
                # Handle different string formats
                if job_state_raw.startswith("\\x"):
                    # Escaped hex string like '\x80\x04\x95...'
                    job_state_bytes, _ = codecs.escape_decode(
                        job_state_raw.encode("latin1")
                    )
                elif job_state_raw.startswith("x"):
                    # Hex string without escape characters
                    job_state_bytes = bytes.fromhex(job_state_raw[1:])
                else:
                    # Try to decode as base64 directly
                    try:
                        job_state_bytes = base64.b64decode(job_state_raw)
                    except Exception:
                        # If that fails, try to decode as UTF-8 and then base64
                        job_state_bytes = base64.b64decode(
                            job_state_raw.encode("utf-8")
                        )
            else:
                # Fallback for other formats
                job_state_bytes = job_state_raw

            # Try multiple decoding strategies
            job_data = None

            # Strategy 1: Try base64 decode then JSON
            try:
                job_state_json = base64.b64decode(job_state_bytes).decode("utf-8")
                job_data = json.loads(job_state_json)
                logger.debug(
                    f"Successfully decoded job {job_id} using base64+JSON strategy"
                )
            except Exception as e1:
                logger.debug(f"Base64+JSON strategy failed for job {job_id}: {e1}")

                # Strategy 2: Try direct JSON decode
                try:
                    if isinstance(job_state_bytes, bytes):
                        job_state_json = job_state_bytes.decode("utf-8")
                    else:
                        job_state_json = str(job_state_bytes)
                    job_data = json.loads(job_state_json)
                    logger.debug(
                        f"Successfully decoded job {job_id} using direct JSON strategy"
                    )
                except Exception as e2:
                    logger.debug(f"Direct JSON strategy failed for job {job_id}: {e2}")

                    # Strategy 3: Try to fix common JSON issues
                    try:
                        if isinstance(job_state_bytes, bytes):
                            job_state_json = job_state_bytes.decode("utf-8")
                        else:
                            job_state_json = str(job_state_bytes)

                        # Try to fix common JSON formatting issues
                        # Remove any leading/trailing whitespace and non-printable characters
                        job_state_json = job_state_json.strip()
                        # Remove any null bytes
                        job_state_json = job_state_json.replace("\x00", "")

                        job_data = json.loads(job_state_json)
                        logger.debug(
                            f"Successfully decoded job {job_id} using cleaned JSON strategy"
                        )
                    except Exception as e3:
                        logger.debug(
                            f"Cleaned JSON strategy failed for job {job_id}: {e3}"
                        )

                        # Strategy 4: Try to extract JSON from the data
                        try:
                            if isinstance(job_state_bytes, bytes):
                                job_state_json = job_state_bytes.decode(
                                    "utf-8", errors="ignore"
                                )
                            else:
                                job_state_json = str(job_state_bytes)

                            # Look for JSON-like content
                            import re

                            json_match = re.search(r"\{.*\}", job_state_json, re.DOTALL)
                            if json_match:
                                job_data = json.loads(json_match.group())
                                logger.debug(
                                    f"Successfully decoded job {job_id} using regex JSON extraction"
                                )
                            else:
                                raise Exception("No JSON content found")
                        except Exception as e4:
                            logger.debug(
                                f"Regex JSON extraction failed for job {job_id}: {e4}"
                            )

                            # Strategy 5: Try Python pickle decode (for legacy data)
                            try:
                                import pickle

                                job_data = pickle.loads(job_state_bytes)
                                logger.debug(
                                    f"Successfully decoded job {job_id} using pickle strategy"
                                )
                            except Exception as e5:
                                logger.debug(
                                    f"Pickle strategy failed for job {job_id}: {e5}"
                                )

                                # Strategy 6: Try to create a minimal job state from the job ID
                                try:
                                    # Extract meeting ID from job ID
                                    if job_id and job_id.startswith(
                                        "meeting_status_update_"
                                    ):
                                        meeting_id = job_id.replace(
                                            "meeting_status_update_", ""
                                        )
                                        # Create a minimal job state that can be reconstructed
                                        job_data = {
                                            "id": job_id,
                                            "func": "update_meeting_status",
                                            "trigger": "date",
                                            "args": [meeting_id],
                                            "kwargs": {},
                                            "next_run_time": None,  # Will be set by the scheduler
                                            "misfire_grace_time": None,
                                            "coalesce": False,
                                            "max_instances": 1,
                                        }
                                        logger.debug(
                                            f"Created minimal job state for {job_id} from job ID"
                                        )
                                    else:
                                        raise Exception(
                                            "Cannot create minimal job state"
                                        )
                                except Exception as e6:
                                    logger.debug(
                                        f"Minimal job state creation failed for job {job_id}: {e6}"
                                    )
                                    # All strategies failed
                                    raise Exception(
                                        f"All decoding strategies failed: {e1}, {e2}, {e3}, {e4}, {e5}, {e6}"
                                    ) from e6

            if job_data is None:
                raise Exception("Failed to decode job data")

            # Convert back to job state format
            job_state = {
                "id": job_data.get("id"),
                "func": job_data.get("func"),
                "trigger": job_data.get("trigger"),
                "args": job_data.get("args", []),
                "kwargs": job_data.get("kwargs", {}),
                "next_run_time": job_data.get("next_run_time"),
                "misfire_grace_time": job_data.get("misfire_grace_time"),
                "coalesce": job_data.get("coalesce", False),
                "max_instances": job_data.get("max_instances", 1),
            }

            return job_state

        except Exception as e:
            logger.warning(f"Error decoding job state for {job_id or 'unknown'}: {e}")
            return None

    def lookup_job(self, job_id):
        """Look up a job by its ID."""
        try:
            result = self.supabase.rpc(
                "get_scheduler_job", {"job_id": job_id}
            ).execute()

            if result.data:
                job_data = result.data[0]
                job_state_raw = job_data["job_state"]

                job_state = self._decode_job_state(job_state_raw, job_id)
                if job_state is None:
                    # Try to delete the corrupted job silently
                    try:
                        self.remove_job(job_id)
                        logger.info(f"Cleaned up corrupted job {job_id}")
                    except Exception as del_e:
                        logger.debug(f"Failed to clean up job {job_id}: {del_e}")
                    return None

                # Create a job with the scheduler reference
                job = Job.__new__(Job)
                job.__setstate__(job_state)
                # Set the scheduler reference
                if hasattr(self, "_scheduler"):
                    job._scheduler = self._scheduler
                return job
            return None
        except Exception as e:
            logger.error(f"Error looking up job {job_id}: {e}")
            return None

    def get_due_jobs(self, now):
        """Get jobs that are due to run."""
        try:
            result = self.supabase.rpc("get_all_scheduler_jobs").execute()
            due_jobs = []

            for job_data in result.data:
                job_state_raw = job_data["job_state"]
                job_id = job_data.get("id")

                job_state = self._decode_job_state(job_state_raw, job_id)
                if job_state is None:
                    # Try to delete the corrupted job silently
                    try:
                        if job_id:
                            self.remove_job(job_id)
                            logger.info(f"Cleaned up corrupted job {job_id}")
                    except Exception as del_e:
                        logger.debug(f"Failed to clean up job {job_id}: {del_e}")
                    continue

                job = Job.__new__(Job)
                job.__setstate__(job_state)
                # Set the scheduler reference
                if hasattr(self, "_scheduler"):
                    job._scheduler = self._scheduler

                if job.next_run_time and job.next_run_time <= now:
                    due_jobs.append(job)

            return due_jobs
        except Exception as e:
            logger.error(f"Error getting due jobs: {e}")
            return []

    def get_next_run_time(self):
        """Get the next run time for any job."""
        try:
            result = self.supabase.rpc("get_all_scheduler_jobs").execute()
            next_run_time = None

            for job_data in result.data:
                job_state_raw = job_data["job_state"]
                job_id = job_data.get("id")

                job_state = self._decode_job_state(job_state_raw, job_id)
                if job_state is None:
                    # Try to delete the corrupted job
                    try:
                        if job_id:
                            self.remove_job(job_id)
                            logger.info(f"Deleted corrupted job {job_id}")
                    except Exception as del_e:
                        logger.error(
                            f"Failed to delete corrupted job {job_id}: {del_e}"
                        )
                    continue

                job = Job.__new__(Job)
                job.__setstate__(job_state)
                # Set the scheduler reference
                if hasattr(self, "_scheduler"):
                    job._scheduler = self._scheduler

                if job.next_run_time and (
                    next_run_time is None or job.next_run_time < next_run_time
                ):
                    next_run_time = job.next_run_time

            return next_run_time
        except Exception as e:
            logger.error(f"Error getting next run time: {e}")
            return None

    def add_job(self, job):
        """Add a job to the store."""
        try:
            logger.info(f"Adding job {job.id} to Supabase store")
            # Use JSON serialization for better compatibility
            job_state = job.__getstate__()
            # Convert to JSON-serializable format
            job_data = {
                "id": job_state.get("id"),
                "func": str(job_state.get("func", "")),
                "trigger": str(job_state.get("trigger", "")),
                "args": job_state.get("args", []),
                "kwargs": job_state.get("kwargs", {}),
                "next_run_time": job_state.get("next_run_time", None),
                "misfire_grace_time": job_state.get("misfire_grace_time", None),
                "coalesce": job_state.get("coalesce", False),
                "max_instances": job_state.get("max_instances", 1),
            }
            job_state_json = json.dumps(job_data, default=str)

            # Use custom RPC function to handle JSON data
            self.supabase.rpc(
                "add_scheduler_job",
                {
                    "job_id": job.id,
                    "job_state_base64": base64.b64encode(
                        job_state_json.encode("utf-8")
                    ).decode("utf-8"),
                },
            ).execute()
            logger.info(f"Successfully added job {job.id} to Supabase store")

        except Exception as e:
            logger.error(f"Error adding job {job.id}: {e}")
            raise

    def update_job(self, job):
        """Update a job in the store."""
        self.add_job(job)  # Same as add_job for Supabase

    def remove_job(self, job_id):
        """Remove a job from the store."""
        try:
            self.supabase.rpc("delete_scheduler_job", {"job_id": job_id}).execute()
        except Exception as e:
            logger.error(f"Error removing job {job_id}: {e}")
            raise

    def remove_jobs(self, job_ids):
        """Remove multiple jobs from the store."""
        try:
            for job_id in job_ids:
                self.remove_job(job_id)
        except Exception as e:
            logger.error(f"Error removing jobs {job_ids}: {e}")
            raise

    def get_all_jobs(self):
        """Get all jobs from the store."""
        try:
            result = self.supabase.rpc("get_all_scheduler_jobs").execute()
            jobs = []

            for job_data in result.data:
                job_state_raw = job_data["job_state"]
                job_id = job_data.get("id")

                job_state = self._decode_job_state(job_state_raw, job_id)
                if job_state is None:
                    # Try to delete the corrupted job
                    try:
                        if job_id:
                            self.remove_job(job_id)
                            logger.info(f"Deleted corrupted job {job_id}")
                    except Exception as del_e:
                        logger.error(
                            f"Failed to delete corrupted job {job_id}: {del_e}"
                        )
                    continue

                job = Job.__new__(Job)
                job.__setstate__(job_state)
                # Set the scheduler reference
                if hasattr(self, "_scheduler"):
                    job._scheduler = self._scheduler
                jobs.append(job)

            return jobs
        except Exception as e:
            logger.error(f"Error getting all jobs: {e}")
            return []

    def remove_all_jobs(self):
        """Remove all jobs from the store."""
        try:
            self.supabase.table(self.table_name).delete().neq("id", "").execute()
        except Exception as e:
            logger.error(f"Error removing all jobs: {e}")
            raise


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
                jobstores = {"default": SQLAlchemyJobStore(url=jobstore_url)}
                logger.info("Using SQLite for scheduler jobs in development")
            else:
                # For production, use MemoryJobStore with custom Supabase persistence
                from apscheduler.jobstores.memory import MemoryJobStore
                from supabase import create_client

                # Create Supabase client for persistence
                self.supabase_client = create_client(
                    settings.supabase_url, settings.supabase_service_role_key
                )

                jobstores = {"default": MemoryJobStore()}
                logger.info(
                    "Using MemoryJobStore with Supabase persistence for scheduler jobs in production"
                )

            self.scheduler = AsyncIOScheduler(
                jobstores=jobstores,
                timezone="UTC",
                job_defaults={"coalesce": False, "max_instances": 1},
            )
            logger.info("Scheduler initialized successfully")

            # Schedule daily membership status check
            # Temporarily disabled to test job creation
            # self._schedule_daily_membership_check()

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
            # Load jobs from Supabase if in production
            if settings.environment == "prod":
                await self._load_jobs_from_supabase()

            self.scheduler.start()
            logger.info("Scheduler started successfully")

    async def shutdown(self):
        """Shutdown the scheduler."""
        if self.scheduler and self.scheduler.running:
            # Save jobs to Supabase if in production
            if settings.environment == "prod":
                await self._save_jobs_to_supabase()

            self.scheduler.shutdown()
            logger.info("Scheduler shutdown successfully")

    async def schedule_meeting_status_update(
        self, meeting_id: UUID, end_time: datetime
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
            func=update_meeting_status,
            trigger="date",
            run_date=ensure_utc(end_time),
            id=job_id,
            args=[str(meeting_id)],
            replace_existing=True,
        )

        logger.info(f"Scheduled status update for meeting {meeting_id} at {end_time}")

        # Save to Supabase if in production
        if settings.environment == "prod":
            await self._save_jobs_to_supabase()

    async def cancel_meeting_status_update(self, meeting_id: UUID):
        """Cancel a scheduled meeting status update job."""
        if not self.scheduler:
            return

        job_id = f"meeting_status_update_{meeting_id}"
        if self.scheduler.get_job(job_id):
            self.scheduler.remove_job(job_id)
            logger.info(f"Cancelled status update for meeting {meeting_id}")

            # Save to Supabase if in production
            if settings.environment == "prod":
                await self._save_jobs_to_supabase()

    def get_scheduled_jobs(self):
        """Get all scheduled jobs for debugging."""
        if not self.scheduler:
            return []

        jobs = []
        for job in self.scheduler.get_jobs():
            jobs.append(
                {
                    "id": job.id,
                    "next_run_time": getattr(job, "next_run_time", None),
                    "func": (
                        job.func.__name__
                        if hasattr(job.func, "__name__")
                        else str(job.func)
                    ),
                }
            )
        return jobs

    async def _save_jobs_to_supabase(self):
        """Save all jobs to Supabase."""
        try:
            jobs = self.scheduler.get_jobs()
            logger.info(f"Saving {len(jobs)} jobs to Supabase")

            for job in jobs:
                job_data = {
                    "id": job.id,
                    "func": str(job.func),
                    "trigger": str(job.trigger),
                    "args": job.args,
                    "kwargs": job.kwargs,
                    "next_run_time": (
                        job.next_run_time.isoformat() if job.next_run_time else None
                    ),
                    "misfire_grace_time": job.misfire_grace_time,
                    "coalesce": job.coalesce,
                    "max_instances": job.max_instances,
                }

                job_state_json = json.dumps(job_data, default=str)
                job_state_base64 = base64.b64encode(
                    job_state_json.encode("utf-8")
                ).decode("utf-8")

                # Use RPC function to save job
                self.supabase_client.rpc(
                    "add_scheduler_job",
                    {"job_id": job.id, "job_state_base64": job_state_base64},
                ).execute()

            logger.info("Successfully saved jobs to Supabase")
        except Exception as e:
            logger.error(f"Error saving jobs to Supabase: {e}")

    async def _load_jobs_from_supabase(self):
        """Load all jobs from Supabase."""
        try:
            result = self.supabase_client.rpc("get_all_scheduler_jobs").execute()
            logger.info(f"Loading {len(result.data)} jobs from Supabase")

            for job_data in result.data:
                try:
                    job_state_raw = job_data["job_state"]
                    job_id = job_data.get("id")

                    # Use the improved decoding method
                    job_state = self._decode_job_state_for_loading(
                        job_state_raw, job_id
                    )
                    if job_state is None:
                        # Try to delete corrupted job
                        try:
                            if job_id:
                                self.supabase_client.rpc(
                                    "delete_scheduler_job", {"job_id": job_id}
                                ).execute()
                                logger.info(f"Cleaned up corrupted job {job_id}")
                        except Exception as del_e:
                            logger.debug(f"Failed to clean up job {job_id}: {del_e}")
                        continue

                    # Recreate job
                    args = job_state.get("args", [])
                    kwargs = job_state.get("kwargs", {})
                    next_run_time_str = job_state.get("next_run_time")

                    if next_run_time_str:
                        next_run_time = datetime.fromisoformat(next_run_time_str)
                    else:
                        next_run_time = None

                    # Add job to scheduler
                    self.scheduler.add_job(
                        func=update_meeting_status,  # Default function
                        trigger="date",
                        run_date=next_run_time,
                        id=job_id,
                        args=args,
                        kwargs=kwargs,
                        replace_existing=True,
                    )

                except Exception as e:
                    logger.warning(f"Error loading job {job_data.get('id')}: {e}")
                    # Try to delete corrupted job
                    try:
                        self.supabase_client.rpc(
                            "delete_scheduler_job", {"job_id": job_data.get("id")}
                        ).execute()
                    except Exception as del_e:
                        logger.debug(
                            f"Failed to clean up job {job_data.get('id')}: {del_e}"
                        )

            logger.info("Successfully loaded jobs from Supabase")
        except Exception as e:
            logger.error(f"Error loading jobs from Supabase: {e}")

    def _decode_job_state_for_loading(self, job_state_raw, job_id=None):
        """Decode job state for loading from Supabase (similar to _decode_job_state but for SchedulerService)."""
        try:
            # Convert Supabase BYTEA format to bytes
            if (
                isinstance(job_state_raw, dict)
                and job_state_raw.get("type") == "Buffer"
            ):
                # Supabase returns BYTEA as {"type": "Buffer", "data": [...]}
                job_state_bytes = bytes(job_state_raw["data"])
            elif isinstance(job_state_raw, str):
                # Handle different string formats
                if job_state_raw.startswith("\\x"):
                    # Escaped hex string like '\x80\x04\x95...'
                    job_state_bytes, _ = codecs.escape_decode(
                        job_state_raw.encode("latin1")
                    )
                elif job_state_raw.startswith("x"):
                    # Hex string without escape characters
                    job_state_bytes = bytes.fromhex(job_state_raw[1:])
                else:
                    # Try to decode as base64 directly
                    try:
                        job_state_bytes = base64.b64decode(job_state_raw)
                    except Exception:
                        # If that fails, try to decode as UTF-8 and then base64
                        job_state_bytes = base64.b64decode(
                            job_state_raw.encode("utf-8")
                        )
            else:
                # Fallback for other formats
                job_state_bytes = job_state_raw

            # Try multiple decoding strategies
            job_data = None

            # Strategy 1: Try base64 decode then JSON
            try:
                job_state_json = base64.b64decode(job_state_bytes).decode("utf-8")
                job_data = json.loads(job_state_json)
                logger.debug(
                    f"Successfully decoded job {job_id} using base64+JSON strategy"
                )
            except Exception as e1:
                logger.debug(f"Base64+JSON strategy failed for job {job_id}: {e1}")

                # Strategy 2: Try direct JSON decode
                try:
                    if isinstance(job_state_bytes, bytes):
                        job_state_json = job_state_bytes.decode("utf-8")
                    else:
                        job_state_json = str(job_state_bytes)
                    job_data = json.loads(job_state_json)
                    logger.debug(
                        f"Successfully decoded job {job_id} using direct JSON strategy"
                    )
                except Exception as e2:
                    logger.debug(f"Direct JSON strategy failed for job {job_id}: {e2}")

                    # Strategy 3: Try to fix common JSON issues
                    try:
                        if isinstance(job_state_bytes, bytes):
                            job_state_json = job_state_bytes.decode("utf-8")
                        else:
                            job_state_json = str(job_state_bytes)

                        # Try to fix common JSON formatting issues
                        # Remove any leading/trailing whitespace and non-printable characters
                        job_state_json = job_state_json.strip()
                        # Remove any null bytes
                        job_state_json = job_state_json.replace("\x00", "")

                        job_data = json.loads(job_state_json)
                        logger.debug(
                            f"Successfully decoded job {job_id} using cleaned JSON strategy"
                        )
                    except Exception as e3:
                        logger.debug(
                            f"Cleaned JSON strategy failed for job {job_id}: {e3}"
                        )

                        # Strategy 4: Try to extract JSON from the data
                        try:
                            if isinstance(job_state_bytes, bytes):
                                job_state_json = job_state_bytes.decode(
                                    "utf-8", errors="ignore"
                                )
                            else:
                                job_state_json = str(job_state_bytes)

                            # Look for JSON-like content
                            import re

                            json_match = re.search(r"\{.*\}", job_state_json, re.DOTALL)
                            if json_match:
                                job_data = json.loads(json_match.group())
                                logger.debug(
                                    f"Successfully decoded job {job_id} using regex JSON extraction"
                                )
                            else:
                                raise Exception("No JSON content found")
                        except Exception as e4:
                            logger.debug(
                                f"Regex JSON extraction failed for job {job_id}: {e4}"
                            )

                            # Strategy 5: Try Python pickle decode (for legacy data)
                            try:
                                import pickle

                                job_data = pickle.loads(job_state_bytes)
                                logger.debug(
                                    f"Successfully decoded job {job_id} using pickle strategy"
                                )
                            except Exception as e5:
                                logger.debug(
                                    f"Pickle strategy failed for job {job_id}: {e5}"
                                )

                                # Strategy 6: Try to create a minimal job state from the job ID
                                try:
                                    # Extract meeting ID from job ID
                                    if job_id and job_id.startswith(
                                        "meeting_status_update_"
                                    ):
                                        meeting_id = job_id.replace(
                                            "meeting_status_update_", ""
                                        )
                                        # Create a minimal job state that can be reconstructed
                                        job_data = {
                                            "id": job_id,
                                            "func": "update_meeting_status",
                                            "trigger": "date",
                                            "args": [meeting_id],
                                            "kwargs": {},
                                            "next_run_time": None,  # Will be set by the scheduler
                                            "misfire_grace_time": None,
                                            "coalesce": False,
                                            "max_instances": 1,
                                        }
                                        logger.debug(
                                            f"Created minimal job state for {job_id} from job ID"
                                        )
                                    else:
                                        raise Exception(
                                            "Cannot create minimal job state"
                                        )
                                except Exception as e6:
                                    logger.debug(
                                        f"Minimal job state creation failed for job {job_id}: {e6}"
                                    )
                                    # All strategies failed
                                    raise Exception(
                                        f"All decoding strategies failed: {e1}, {e2}, {e3}, {e4}, {e5}, {e6}"
                                    ) from e6

            if job_data is None:
                raise Exception("Failed to decode job data")

            return job_data

        except Exception as e:
            logger.warning(f"Error decoding job state for {job_id or 'unknown'}: {e}")
            return None


def update_meeting_status(meeting_id: str):
    """Standalone function to update meeting status from 'upcoming' to 'done' when meeting ends."""
    try:
        from datetime import UTC, datetime

        current_time = datetime.now(UTC)

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

            # Check if the meeting has actually ended
            if meeting.end_time > current_time:
                logger.info(
                    f"Meeting {meeting_id} has not ended yet (ends at {meeting.end_time}), skipping update"
                )
                db.close()
                return

            if meeting.status == MeetingStatus.UPCOMING.value:
                meeting.status = MeetingStatus.DONE.value
                db.commit()
                logger.info(
                    f"Updated meeting {meeting_id} status to 'done' (ended at {meeting.end_time})"
                )
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

            # Check if the meeting has actually ended
            end_time_str = meeting_data.get("end_time")
            if end_time_str:
                end_time = datetime.fromisoformat(end_time_str.replace("Z", "+00:00"))
                if end_time > current_time:
                    logger.info(
                        f"Meeting {meeting_id} has not ended yet (ends at {end_time}), skipping update"
                    )
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
                    logger.info(
                        f"Updated meeting {meeting_id} status to 'done' (ended at {end_time_str})"
                    )
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
