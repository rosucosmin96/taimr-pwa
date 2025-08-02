from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth.controller import router as auth_router
from app.api.clients import router as clients_router
from app.api.meetings import router as meetings_router
from app.api.memberships import router as memberships_router
from app.api.notifications import router as notifications_router
from app.api.profile import router as profile_router
from app.api.recurrences import router as recurrences_router
from app.api.services import router as services_router
from app.api.stats import router as stats_router
from app.config import settings
from app.services.scheduler_service import scheduler_service

app = FastAPI(
    title="Freelancer PWA API",
    description="API for managing freelancer services, clients, and meetings",
    version="1.0.0",
)


def init_database():
    """Initialize database tables."""
    if settings.environment == "dev":
        print(f"Initializing SQLite database: {settings.database_path}")
        from sqlalchemy import create_engine

        from app.models.base import Base

        engine = create_engine(f"sqlite:///{settings.database_path}")
        Base.metadata.create_all(engine)
        print("Database initialized successfully!")
    else:
        print("Supabase tables are managed via migrations. No action taken.")


def init_scheduler_jobs():
    """Initialize scheduled jobs for existing upcoming meetings."""
    print("Scheduler job initialization is handled by the scheduler service.")
    return True


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    # Always initialize database tables
    init_database()

    # Start the scheduler for meeting status updates
    await scheduler_service.start()

    # Initialize scheduled jobs for existing upcoming meetings
    if settings.enable_meeting_status_updates:
        print("🔄 Initializing scheduled jobs for existing meetings...")
        success = init_scheduler_jobs()
        if success:
            print("✅ Scheduler jobs initialized successfully")
        else:
            print("⚠️  Scheduler jobs initialization failed")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth_router, prefix="/auth", tags=["authentication"])
app.include_router(services_router, prefix="/services", tags=["services"])
app.include_router(clients_router, prefix="/clients", tags=["clients"])
app.include_router(meetings_router, prefix="/meetings", tags=["meetings"])
app.include_router(memberships_router, prefix="/memberships", tags=["memberships"])
app.include_router(
    notifications_router, prefix="/notifications", tags=["notifications"]
)
app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(stats_router, prefix="/stats", tags=["stats"])
app.include_router(recurrences_router, prefix="/recurrences", tags=["recurrences"])


@app.get("/")
async def root():
    return {"message": "Freelancer PWA API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.get("/debug/scheduler")
async def debug_scheduler():
    """Debug endpoint to view scheduled jobs (development only)."""
    if settings.environment != "dev":
        return {"error": "Debug endpoint only available in development"}

    jobs = scheduler_service.get_scheduled_jobs()
    return {
        "scheduler_enabled": settings.enable_meeting_status_updates,
        "scheduled_jobs": jobs,
        "job_count": len(jobs),
    }


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown the scheduler on app shutdown."""
    await scheduler_service.shutdown()
