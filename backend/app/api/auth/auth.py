from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from app.config import settings

# Security scheme for JWT tokens
security = HTTPBearer()

# Initialize Supabase client
supabase: Client = create_client(
    settings.supabase_url, settings.supabase_service_role_key
)


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UUID:
    """
    Extract and validate JWT token to get current user ID.
    This is a shared dependency used across all controllers.
    """
    try:
        token = credentials.credentials

        # Development mode bypass for testing
        if settings.environment == "dev":
            # Return a test user ID for development
            return UUID("00000000-0000-0000-0000-000000000000")

        # Validate token with Supabase
        try:
            # Use Supabase to verify the JWT token
            user = supabase.auth.get_user(token)
            user_id = UUID(user.user.id)
            return user_id
        except Exception as jwt_error:
            # If Supabase validation fails, try manual JWT validation as fallback
            try:
                # Decode JWT without verification for development
                if settings.debug:
                    decoded_token = jwt.decode(
                        token, options={"verify_signature": False}
                    )
                    user_id = UUID(
                        decoded_token.get("sub", "00000000-0000-0000-0000-000000000000")
                    )
                    return user_id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authentication credentials",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
            except jwt.InvalidTokenError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from jwt_error

    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err


async def get_current_user_email(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    Extract and validate JWT token to get current user email.
    """
    try:
        token = credentials.credentials

        # Development mode bypass for testing
        if settings.environment == "dev":
            # Return a test email for development
            return "dev@example.com"

        # Validate token with Supabase
        try:
            user = supabase.auth.get_user(token)
            return user.user.email
        except Exception:
            # Fallback for development
            if settings.debug:
                return "test@example.com"
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from None

    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err


def get_supabase_client() -> Client:
    """Get Supabase client for authentication operations"""
    return supabase
