from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.config import settings
from app.middleware import setup_middleware

# Validate environment variables on startup
try:
    settings.validate()
except ValueError as e:
    print(f"Configuration error: {e}")
    exit(1)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# Set up middleware
setup_middleware(app)


@app.get("/")
async def root():
    """Root endpoint with application info."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",  # TODO: Add proper timestamp
    }


@app.get("/api/v1/health")
async def api_health_check():
    """API health check endpoint."""
    return {"status": "healthy", "api_version": "v1"}


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG
    )
