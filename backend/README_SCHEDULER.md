# Meeting Status Scheduler

## Overview

This implementation provides automatic real-time updates for meeting statuses using APScheduler. When a meeting's end time is reached, its status is automatically changed from "upcoming" to "done".

## Features

- **Real-time Updates**: Status changes happen exactly when meetings end
- **Persistent Jobs**: Scheduled jobs persist across app restarts
- **UTC Handling**: All timestamps are handled in UTC
- **Dynamic Updates**: Jobs are rescheduled when meeting times change
- **Automatic Cleanup**: Jobs are cancelled when meetings are deleted

## Configuration

### Environment Variables

- `ENABLE_MEETING_STATUS_UPDATES`: Enable/disable the feature (default: true)
- `SCHEDULER_JOBSTORE_URL`: SQLite database for job persistence (default: sqlite:///scheduler_jobs.db)

### Example .env

```env
ENABLE_MEETING_STATUS_UPDATES=true
SCHEDULER_JOBSTORE_URL=sqlite:///scheduler_jobs.db
```

## How It Works

1. **Meeting Creation**: When a meeting is created with "upcoming" status, a job is scheduled to run at the meeting's end time
2. **Meeting Updates**: When a meeting's end time is modified, the existing job is cancelled and a new one is scheduled
3. **Meeting Deletion**: When a meeting is deleted, its scheduled job is cancelled
4. **Status Update**: When the job runs, it changes the meeting status from "upcoming" to "done"

## API Endpoints

### Debug Endpoint (Development Only)

```
GET /debug/scheduler
```

Returns information about scheduled jobs and scheduler status.

## Database

The scheduler uses a separate SQLite database (`scheduler_jobs.db`) to persist scheduled jobs across app restarts.

## Testing

Run the scheduler tests:

```bash
cd backend
python -m pytest tests/test_scheduler_service.py -v
```

## Migration

When starting the app for the first time with existing meetings, the system will automatically schedule jobs for all upcoming meetings that haven't ended yet.

## Troubleshooting

1. **Jobs not running**: Check if `ENABLE_MEETING_STATUS_UPDATES=true`
2. **Jobs not persisting**: Verify `SCHEDULER_JOBSTORE_URL` is set correctly
3. **Timezone issues**: All times are handled in UTC, ensure frontend converts appropriately

## Dependencies

- `APScheduler==3.10.4`: Job scheduling library
- `SQLAlchemy`: Database ORM (already included)
