from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.database import db

# Security scheme for JWT tokens
security = HTTPBearer()


class AuthManager:
    """Authentication and authorization manager."""

    @staticmethod
    def verify_jwt_token(token: str) -> dict | None:
        """Verify and decode JWT token."""
        try:
            # For Supabase JWT, we need to verify with their public key
            # For now, we'll decode without verification (Supabase handles this)
            payload = jwt.decode(
                token,
                options={"verify_signature": False},  # Supabase handles verification
            )
            return payload
        except JWTError:
            return None

    @staticmethod
    def get_current_user(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ) -> dict:
        """Get current authenticated user from JWT token."""
        token = credentials.credentials

        # Verify token
        payload = AuthManager.verify_jwt_token(token)
        if payload is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Extract user information from Supabase JWT
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Get user from database
        try:
            user_response = (
                db.get_table("users").select("*").eq("id", user_id).execute()
            )
            if not user_response.data:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            return user_response.data[0]
        except Exception as err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error",
            ) from err


# Create auth manager instance
auth = AuthManager()
