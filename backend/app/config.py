import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "dev").lower()

    # Test data configuration
    create_test_data: bool = os.getenv("CREATE_TEST_DATA", "false").lower() == "true"

    # Supabase configuration
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_key: str = os.getenv("SUPABASE_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Database settings
    database_path: str = os.getenv("DATABASE_PATH", "database.sqlite")

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

    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields instead of raising errors


settings = Settings()
