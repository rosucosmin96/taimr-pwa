from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.clients import router as clients_router
from app.api.meetings import router as meetings_router
from app.api.profile import router as profile_router
from app.api.recurrences import router as recurrences_router
from app.api.services import router as services_router
from app.api.stats import router as stats_router

app = FastAPI(
    title="Freelancer PWA API",
    description="API for managing freelancer services, clients, and meetings",
    version="1.0.0",
)

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
app.include_router(profile_router, prefix="/profile", tags=["profile"])
app.include_router(stats_router, prefix="/stats", tags=["stats"])
app.include_router(recurrences_router, prefix="/recurrences", tags=["recurrences"])


@app.get("/")
async def root():
    return {"message": "Freelancer PWA API"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
