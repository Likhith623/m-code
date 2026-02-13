from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase, supabase_admin
from app.schemas import (
    UserSignUp, UserSignIn, TokenResponse, 
    UserProfile, UserProfileUpdate
)
from typing import Optional
import httpx

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return current user"""
    try:
        token = credentials.credentials
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        # Get user profile
        profile = supabase.table("profiles").select("*").eq("id", user_response.user.id).single().execute()
        
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "profile": profile.data if profile.data else None
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )


@router.post("/signup", response_model=TokenResponse)
async def sign_up(user_data: UserSignUp):
    """Register a new user (customer or retailer) with improved error logging"""
    try:
        # Create user in Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
            "options": {
                "data": {
                    "full_name": user_data.full_name,
                    "role": user_data.role.value
                }
            }
        })

        # Check for SDK-level error first
        sdk_error = None
        try:
            sdk_error = getattr(auth_response, 'error', None) or (auth_response.get('error') if isinstance(auth_response, dict) else None)
        except Exception:
            sdk_error = None

        if sdk_error:
            # Log full SDK error so you can inspect Supabase trigger/database problems
            import logging
            logging.getLogger(__name__).error("Supabase sign_up error: %s", sdk_error)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Registration failed: {sdk_error}")

        # Ensure a user object was returned
        if not getattr(auth_response, 'user', None):
            import logging
            logging.getLogger(__name__).error("Supabase sign_up returned no user. Response: %s", auth_response)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to create user")

        # Update profile with additional info (use admin client)
        if user_data.phone:
            update_resp = supabase_admin.table("profiles").update({
                "phone": user_data.phone
            }).eq("id", auth_response.user.id).execute()
            try:
                upd_err = getattr(update_resp, 'error', None) or (update_resp.get('error') if isinstance(update_resp, dict) else None)
            except Exception:
                upd_err = None
            if upd_err:
                logging.getLogger(__name__).warning("Profile update warning for user %s: %s", auth_response.user.id, upd_err)

        # Fetch the created profile (if trigger created one)
        profile = supabase_admin.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()

        return TokenResponse(
            access_token=auth_response.session.access_token if getattr(auth_response, 'session', None) else "",
            user={
                "id": str(auth_response.user.id),
                "email": auth_response.user.email,
                "role": user_data.role.value,
                "full_name": user_data.full_name,
                "profile": getattr(profile, 'data', profile.get('data') if isinstance(profile, dict) else None)
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Unexpected error during signup: %s", e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Registration failed: {str(e)}")


@router.post("/signin", response_model=TokenResponse)
async def sign_in(credentials: UserSignIn):
    """Sign in an existing user"""
    try:
        auth_response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Get user profile
        profile = supabase.table("profiles").select("*").eq("id", auth_response.user.id).single().execute()
        
        return TokenResponse(
            access_token=auth_response.session.access_token,
            user={
                "id": str(auth_response.user.id),
                "email": auth_response.user.email,
                "role": profile.data.get("role") if profile.data else "customer",
                "full_name": profile.data.get("full_name") if profile.data else "",
                "profile": profile.data
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Sign in failed: {str(e)}"
        )


@router.post("/signout")
async def sign_out(current_user: dict = Depends(get_current_user)):
    """Sign out the current user"""
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully signed out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sign out failed: {str(e)}"
        )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    profile = current_user.get("profile")
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found"
        )
    return UserProfile(**profile)


@router.put("/me", response_model=UserProfile)
async def update_me(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user's profile"""
    try:
        update_data = profile_update.model_dump(exclude_unset=True)
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No data to update"
            )
        
        result = supabase.table("profiles").update(update_data).eq("id", current_user["id"]).execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        return UserProfile(**result.data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Update failed: {str(e)}"
        )


@router.post("/refresh")
async def refresh_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Refresh the access token"""
    try:
        # This would need the refresh token, for now we just verify the current token
        user_response = supabase.auth.get_user(credentials.credentials)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return {"message": "Token is valid", "user_id": str(user_response.user.id)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {str(e)}"
        )
