import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "dev").lower()

    # Supabase configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Database settings
    database_path: str = os.getenv("DATABASE_PATH", "database.sqlite")

    # PostgreSQL settings (for production) - Not needed with Supabase SDK
    postgres_url: str = os.getenv("POSTGRES_URL", "")

    @property
    def database_url(self) -> str:
        """Get the appropriate database URL based on environment"""
        if self.environment == "dev":
            return f"sqlite:///{self.database_path}"
        else:
            # Production/Staging - use Supabase SDK, not direct PostgreSQL
            # This is the correct implementation for Supabase SDK architecture
            return "supabase://sdk"

    # Application settings
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    app_name: str = os.getenv("APP_NAME", "Freelancer PWA API")
    app_version: str = os.getenv("APP_VERSION", "1.0.0")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: str = os.getenv("PORT", "8000")

    # JWT settings
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: str = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

    # CORS settings
    allowed_origins: str = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    )

    # Scheduler settings
    scheduler_jobstore_url: str = os.getenv(
        "SCHEDULER_JOBSTORE_URL", "sqlite:///scheduler_jobs.db"
    )
    enable_meeting_status_updates: bool = (
        os.getenv("ENABLE_MEETING_STATUS_UPDATES", "true").lower() == "true"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields instead of raising errors


settings = Settings()
