# Database Setup

This directory contains the database abstraction layer for the Freelancer PWA application.

## Architecture

The database system uses a factory pattern to support multiple database providers:

- **SQLite**: For local development (`ENVIRONMENT=dev`)
- **PostgreSQL/Supabase**: For production (`ENVIRONMENT=prod`) - *Not yet implemented*

## Components

### Core Files

- `base.py`: Abstract base class defining the database provider interface
- `factory.py`: Factory class that creates the appropriate database provider based on environment
- `sqlite_provider.py`: SQLite implementation for local development
- `session.py`: FastAPI dependency for database sessions
- `init_db.py`: Database initialization utilities
- `init_test_data.py`: Test data initialization for development

### Models

All database models are defined in the `../models/` directory:

- `User`: Application users
- `Service`: Services offered by users
- `Client`: Clients of users
- `Meeting`: Scheduled appointments
- `Recurrence`: Recurring meeting patterns

## Usage

### Environment Configuration

Set the environment variable to choose the database provider:

```bash
# For local development (SQLite)
ENVIRONMENT=dev

# For production (PostgreSQL/Supabase)
ENVIRONMENT=prod
```

### Database Session in FastAPI

```python
from app.database import get_db
from sqlalchemy.orm import Session

@app.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

### Manual Database Operations

```python
from app.database.factory import DatabaseFactory

# Get the current database provider
db_provider = DatabaseFactory.get_current_provider()

# Create tables
db_provider.create_tables()

# Get a session
session = db_provider.get_session()
```

### Test Data Initialization

For development, you can automatically create test data:

```bash
# Enable test data creation in .env
CREATE_TEST_DATA=true
ENVIRONMENT=dev
```

The application will automatically create test data on startup when:
- `ENVIRONMENT=dev` (development mode)
- `CREATE_TEST_DATA=true` (explicitly enabled)

**Test data includes:**
- 1 test user with ID `00000000-0000-0000-0000-000000000000`
- 3 services (Web Development, Graphic Design, Consulting)
- 3 clients with different pricing configurations
- 3 meetings (past, today, and future)

**Safety Features:**
- Test data creation is idempotent (safe to run multiple times)
- Test data is never created in production, even if `CREATE_TEST_DATA=true`
- Each function checks for existing data before creating new records

## Testing

Run the test script to verify the database setup:

```bash
cd backend
python test_db.py
```

## Future Enhancements

- PostgreSQL/Supabase provider implementation
- Database migrations with Alembic
- Connection pooling for production
- Database backup and restore utilities
