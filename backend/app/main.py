from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.clients import router as clients_router
from app.api.meetings import router as meetings_router
from app.api.memberships import router as memberships_router
from app.api.profile import router as profile_router
from app.api.recurrences import router as recurrences_router
from app.api.services import router as services_router
from app.api.stats import router as stats_router
from app.config import settings
from app.database.init_db import init_database
from app.database.init_test_data import init_test_data

app = FastAPI(
    title="Freelancer PWA API",
    description="API for managing freelancer services, clients, and meetings",
    version="1.0.0",
)


# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    # Always initialize database tables
    init_database()

    # Create test data only in development and when explicitly enabled
    if settings.environment == "dev" and settings.create_test_data:
        print("🔄 Creating test data for development...")
        success = init_test_data()
        if success:
            print("✅ Test data created successfully")
        else:
            print("⚠️  Test data creation failed - continuing without test data")
    elif settings.environment == "prod" and settings.create_test_data:
        print("⚠️  CREATE_TEST_DATA is enabled in production - this is not recommended")


# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(services_router, prefix="/services", tags=["services"])
app.include_router(clients_router, prefix="/clients", tags=["clients"])
app.include_router(meetings_router, prefix="/meetings", tags=["meetings"])
app.include_router(memberships_router, prefix="/memberships", tags=["memberships"])
app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(stats_router, prefix="/stats", tags=["stats"])
app.include_router(recurrences_router, prefix="/recurrences", tags=["recurrences"])


@app.get("/")
async def root():
    return {"message": "Freelancer PWA API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
