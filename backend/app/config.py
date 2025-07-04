import os

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Database Configuration
    LOCAL_ENVIRONMENT: bool = os.getenv("LOCAL_ENVIRONMENT", "false").lower() == "true"

    # Application Configuration
    APP_NAME: str = os.getenv("APP_NAME", "Freelancer PWA API")
    APP_VERSION: str = os.getenv("APP_VERSION", "1.0.0")
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # CORS Configuration
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173"
    ).split(",")

    @classmethod
    def validate(cls) -> None:
        """Validate required environment variables."""
        required_vars = []

        # Only require Supabase config if not in local environment
        if not cls.LOCAL_ENVIRONMENT:
            required_vars.extend(["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"])

        # Always require SECRET_KEY
        required_vars.append("SECRET_KEY")

        missing_vars = []
        for var in required_vars:
            if not getattr(cls, var):
                missing_vars.append(var)

        if missing_vars:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )


# Create settings instance
settings = Settings()
