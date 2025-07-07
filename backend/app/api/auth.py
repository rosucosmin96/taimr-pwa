from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

# Security scheme for JWT tokens
security = HTTPBearer()


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UUID:
    """
    Extract and validate JWT token to get current user ID.
    This is a shared dependency used across all controllers.
    """
    try:
        # TODO: Implement proper JWT validation with Supabase
        # For now, this is a placeholder that will need to be implemented
        # when Supabase integration is added

        token = credentials.credentials

        # For development/testing, accept any token and return a mock user ID
        # This should be removed in production
        if settings.debug or token == "test-token" or token.startswith("mock-"):
            return UUID("00000000-0000-0000-0000-000000000000")

        # TODO: Replace with actual JWT validation
        # decoded_token = jwt.decode(token, settings.supabase_key, algorithms=["HS256"])
        # user_id = UUID(decoded_token["sub"])
        # return user_id

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    except jwt.InvalidTokenError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
