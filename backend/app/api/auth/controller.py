from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.api.auth import get_supabase_client
from app.api.profile.service import ProfileService

router = APIRouter(tags=["Authentication"])


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    name: str | None = None


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user_id: str
    email: str
    name: str | None = None


@router.post("/signup", response_model=AuthResponse)
async def sign_up(
    request: SignUpRequest,
    supabase=Depends(get_supabase_client),
):
    """Register a new user"""
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        if auth_response.user:
            user_id = auth_response.user.id
            email = auth_response.user.email

            # Create user profile in our database
            profile_service = ProfileService()
            profile = await profile_service.create_user_profile(
                user_id=user_id, email=email, name=request.name
            )

            return AuthResponse(
                access_token=auth_response.session.access_token,
                refresh_token=auth_response.session.refresh_token,
                user_id=user_id,
                email=email,
                name=profile.name,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user"
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.post("/signin", response_model=AuthResponse)
async def sign_in(
    request: SignInRequest,
    supabase=Depends(get_supabase_client),
):
    """Sign in existing user"""
    try:
        # Sign in with Supabase Auth
        auth_response = supabase.auth.sign_in_with_password(
            {
                "email": request.email,
                "password": request.password,
            }
        )

        if auth_response.user:
            return AuthResponse(
                access_token=auth_response.session.access_token,
                refresh_token=auth_response.session.refresh_token,
                user_id=auth_response.user.id,
                email=auth_response.user.email,
                name=None,  # Will be fetched from profile
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
            )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        ) from None


@router.post("/signout")
async def sign_out(
    supabase=Depends(get_supabase_client),
):
    """Sign out user"""
    try:
        supabase.auth.sign_out()
        return {"message": "Signed out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.post("/password-reset")
async def password_reset(
    request: PasswordResetRequest,
    supabase=Depends(get_supabase_client),
):
    """Send password reset email"""
    try:
        supabase.auth.reset_password_email(request.email)
        return {"message": "Password reset email sent"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e


@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    supabase=Depends(get_supabase_client),
):
    """Refresh access token"""
    try:
        auth_response = supabase.auth.refresh_session(refresh_token)
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token"
        ) from None
