# Scheduler Service Documentation

## Overview

The Scheduler Service manages automated tasks for the Freelancer PWA, primarily handling meeting status updates when meetings end.

## Features

### Meeting Status Updates
- Automatically updates meeting status from "upcoming" to "done" when meetings end
- Jobs are scheduled when meetings are created or updated
- Jobs are cancelled when meetings are deleted or status changes

### Startup Job Recovery
- **New Feature**: On application startup, the system automatically checks for existing upcoming meetings
- **Non-blocking**: Job initialization runs in the background and doesn't delay app startup
- Ensures all upcoming meetings have scheduled status update jobs
- Prevents data inconsistency if the application was restarted while meetings were active
- Works in both development (SQLite) and production (Supabase) environments

## Configuration

### Environment Variables
- `ENABLE_MEETING_STATUS_UPDATES`: Enable/disable the scheduler (default: true)
- `ENVIRONMENT`: Set to "dev" for SQLite or "prod" for Supabase
- `SCHEDULER_JOBSTORE_URL`: SQLite database URL for development
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: For production persistence

## Usage

### Automatic Operation
The scheduler starts automatically when the FastAPI application starts:

```python
# In main.py startup event
await scheduler_service.start()  # Blocks until scheduler is ready
asyncio.create_task(background_init_scheduler_jobs())  # Non-blocking background task
```

**Key Points:**
- The scheduler itself starts synchronously (required for job scheduling)
- Job initialization for existing meetings runs in the background
- The app becomes available immediately without waiting for job initialization
- Background task starts 1 second after app startup to ensure everything is ready

### Manual Job Management
```python
from app.services.scheduler_service import scheduler_service

# Schedule a meeting status update
await scheduler_service.schedule_meeting_status_update(meeting_id, end_time)

# Cancel a meeting status update
await scheduler_service.cancel_meeting_status_update(meeting_id)

# Get all scheduled jobs (debug)
jobs = scheduler_service.get_scheduled_jobs()
```

### Startup Job Recovery
```python
from app.api.meetings.service import MeetingService

meeting_service = MeetingService()
result = await meeting_service.ensure_scheduled_jobs_for_existing_meetings()

# Result contains:
# - total_meetings: Number of upcoming meetings found
# - jobs_scheduled: Number of new jobs created
# - jobs_already_exist: Number of jobs that already existed
# - errors: List of any errors encountered
# - success: Overall success status
```

## Debug Endpoints

### Development Only
- `GET /debug/scheduler`: View all scheduled jobs and scheduler status

## Job Storage

### Development (SQLite)
- Uses SQLAlchemy job store with SQLite database
- Jobs persist between application restarts
- File: `scheduler_jobs.db`

### Production (Supabase)
- Uses MemoryJobStore with custom Supabase persistence
- Jobs are saved to and loaded from Supabase on startup/shutdown
- Provides better scalability and reliability

## Error Handling

- Failed job scheduling is logged but doesn't prevent other jobs from being scheduled
- Corrupted jobs are automatically cleaned up
- Startup recovery provides detailed error reporting
- Background job initialization errors don't affect app availability

## Monitoring

- All scheduler operations are logged with appropriate log levels
- Startup recovery provides summary statistics
- Debug endpoint available in development for job inspection
- Background task completion is logged with success/failure status

## Performance Considerations

### Startup Performance
- **App startup**: Fast and non-blocking
- **Scheduler startup**: Quick initialization (required for job scheduling)
- **Job recovery**: Runs in background, doesn't affect app availability
- **Database queries**: Only queries upcoming meetings, not all meetings

### Runtime Performance
- Job scheduling: O(1) per meeting
- Job execution: Minimal overhead
- Background task: Runs once per app startup

## Future Enhancements

- Daily membership status checks (currently disabled)
- Retry mechanisms for failed jobs
- Job execution metrics and monitoring
- Webhook notifications for job completion
- Configurable background task delay
