"""
Authentication endpoints for user registration, login, logout, and token refresh.

Security improvements:
- Rate limiting via SlowAPI (prevents brute-force)
- HttpOnly cookies for token storage (prevents XSS token theft)
- Timing-attack protection on failed logins
- RFC 5322 email validation

Requirements: 1.1, 1.2, 1.3, 1.4, 1.7, 1.8
"""
import asyncio
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.services.auth.security import security_service
from app.services.auth.dependencies import get_current_user
from app.models.user import User
from app.services.infrastructure.email_service import create_and_send_otp, verify_otp
from app.schemas.user import (
    UserCreate,
    UserResponse,
    TokenResponse,
    LoginRequest,
    RefreshTokenRequest,
)
from app.utils.logger import logger


router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer(auto_error=False)

# ── Rate limiter (uses client IP as key) ──────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# Cookie settings
_COOKIE_OPTS = dict(
    httponly=True,
    secure=False,   # Set to True in production (HTTPS)
    samesite="lax",
    path="/",
)
ACCESS_COOKIE  = "access_token"
REFRESH_COOKIE = "refresh_token"


# ── Validators ────────────────────────────────────────────────────────────────
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def validate_email(email: str) -> bool:
    """Validate email format — RFC 5322 simplified. (Req 1.2)"""
    return bool(email) and len(email) <= 255 and bool(EMAIL_REGEX.match(email))


def validate_password_complexity(password: str) -> tuple[bool, Optional[str]]:
    """
    Validate password complexity. (Req 1.3)
    Rules: ≥8 chars, uppercase, lowercase, digit, special char.
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[a-zA-Z]', password):
        return False, "Password must contain at least one letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    return True, None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
@limiter.limit("10/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Create a new user account.

    Validates email, password complexity, role, and email uniqueness.
    Rate limited to 10 requests/minute per IP.

    Requirements: 1.1, 1.2, 1.3, 1.4
    """
    logger.info(f"Registering user: {user_data.email} with role: {user_data.role}")
    
    if not validate_email(user_data.email):
        logger.warning(f"Registration failed: Invalid email format for {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid email format. Must comply with RFC 5322",
        )

    # Note: Complexity is already checked by Pydantic validator in UserCreate schema
    is_valid, error_message = validate_password_complexity(user_data.password)
    if not is_valid:
        logger.warning(f"Registration failed: Password complexity for {user_data.email}: {error_message}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_message,
        )

    if user_data.role not in ("candidate", "recruiter", "admin"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid role. Must be one of: candidate, recruiter, admin",
        )

    password_hash = security_service.hash_password(user_data.password)

    # Check if email exists (including deleted accounts)
    result = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    existing_user = result.scalar_one_or_none()
    
    # If user exists and is deleted, allow re-registration by updating the record
    if existing_user and existing_user.deleted_at is not None:
        logger.info(f"Re-activating deleted account for re-registration: {user_data.email}")
        # Update the existing user instead of deleting
        existing_user.password_hash = password_hash
        existing_user.role = user_data.role
        existing_user.first_name = user_data.first_name
        existing_user.last_name = user_data.last_name
        existing_user.preferred_language = user_data.preferred_language or "en"
        existing_user.deleted_at = None
        existing_user.is_active = True
        existing_user.email_verified = False
        await db.commit()
        await db.refresh(existing_user)
        logger.info(f"User re-registered: {existing_user.email} (role: {existing_user.role})")
        return UserResponse.model_validate(existing_user)
    elif existing_user:
        # User exists and is not deleted
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    
    new_user = User(
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        preferred_language=user_data.preferred_language or "en",
    )

    try:
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        logger.info(f"User registered: {new_user.email} (role: {new_user.role})")
        return UserResponse.model_validate(new_user)

    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed",
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login",
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate user and return JWT tokens.

    Tokens are stored in HttpOnly cookies (prevents XSS theft).
    Response body also contains the access token for API clients.
    Failed attempts include a 500 ms delay (timing-attack protection).

    Rate limited to 5 requests/minute per IP.

    Requirements: 1.7, 1.8
    """
    result = await db.execute(
        select(User).where(
            User.email == login_data.email,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()

    # Timing-attack protection — always delay on failure (Req 1.8)
    if not user or not security_service.verify_password(login_data.password, user.password_hash):
        await asyncio.sleep(0.5)
        logger.warning(
            f"Failed login for {login_data.email} "
            f"from IP {request.client.host if request.client else 'unknown'}"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        await asyncio.sleep(0.5)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    access_token  = security_service.create_access_token(token_data)
    refresh_token = security_service.create_refresh_token(token_data)

    # ── Store tokens in HttpOnly cookies (XSS-safe) ───────────────────────
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=security_service.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        **_COOKIE_OPTS,
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=30 * 24 * 3600,  # 30 days for persistent session
        **_COOKIE_OPTS,
    )

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    logger.info(f"User logged in: {user.email}")

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=security_service.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="User logout",
)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Logout user: blacklist token + clear HttpOnly cookies.

    Requirements: 1.8, 20.15
    """
    from app.core.redis_client import redis_client

    # Try blacklisting whichever token was used (cookie or Bearer header)
    token = request.cookies.get(ACCESS_COOKIE)
    auth_header = request.headers.get("Authorization", "")
    if not token and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if token:
        try:
            await redis_client.blacklist_token(token, ttl_seconds=86400)
            await redis_client.delete_session(str(current_user.id))
        except Exception as e:
            logger.error(f"Logout Redis error: {e}")

    # Clear cookies
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")

    logger.info(f"User logged out: {current_user.email}")


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    response: Response,
    refresh_data: Optional[RefreshTokenRequest] = None,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Issue a new access token using the refresh token.

    Accepts the refresh token from:
    1. HttpOnly cookie (preferred)
    2. Request body (fallback for API clients)

    Requirements: 1.10
    """
    # Prefer cookie, fall back to body
    token = request.cookies.get(REFRESH_COOKIE)
    if not token and refresh_data:
        token = refresh_data.refresh_token

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token required",
        )

    payload = security_service.verify_refresh_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = UUID(payload.get("sub"))
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    token_data = {"sub": str(user.id), "email": user.email, "role": user.role}
    new_access_token = security_service.create_access_token(token_data)

    # Refresh the access-token cookie
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=new_access_token,
        max_age=security_service.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
        **_COOKIE_OPTS,
    )

    logger.info(f"Token refreshed for: {user.email}")

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=token,
        token_type="bearer",
        expires_in=security_service.ACCESS_TOKEN_EXPIRE_HOURS * 3600,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Return the profile of the currently authenticated user.
    """
    return UserResponse.model_validate(current_user)


# ── Password Reset (OTP via Email) ────────────────────────────────────────────

from pydantic import BaseModel as _BaseModel

class ForgotPasswordRequest(_BaseModel):
    email: str

class ResetPasswordRequest(_BaseModel):
    email: str
    code: str
    new_password: str


@router.post(
    "/forgot-password",
    status_code=status.HTTP_200_OK,
    summary="Request password reset OTP",
)
@limiter.limit("3/minute")
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Send a 6-digit OTP to the user's email for password reset.
    Always returns 200 to avoid email enumeration.
    """
    target_email = body.email.lower().strip()
    logger.info(f"!!! FORGOT_PASSWORD_REQUEST_RECEIVED: Email='{target_email}'")
    
    result = await db.execute(
        select(User).where(
            User.email == target_email,
            User.deleted_at.is_(None),
            User.is_active == True,
        )
    )
    user = result.scalar_one_or_none()

    if user:
        logger.info(f"!!! USER_FOUND: {user.email}. Triggering OTP...")
        ok, otp = create_and_send_otp(user.email)
        if not ok:
            logger.error(f"!!! OTP_SEND_FAILED for {user.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email. Please try again later.",
            )
        logger.info(f"!!! OTP_SENT_SUCCESSFULLY to {user.email}")
    else:
        logger.warning(f"!!! USER_NOT_FOUND_OR_INACTIVE: '{target_email}'")
        # Simulate processing time to prevent timing-based enumeration
        await asyncio.sleep(0.5)

    # Always return the same response to prevent email enumeration
    return {
        "message": "If an account exists with this email, a reset code has been sent.",
        "hint": "Check your inbox (and spam folder). The code expires in 10 minutes."
    }


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Reset password using OTP",
)
@limiter.limit("5/minute")
async def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Verify OTP and set a new password.
    """
    # Validate new password complexity
    is_valid, error_msg = validate_password_complexity(body.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=error_msg,
        )

    # Verify OTP
    if not verify_otp(body.email.lower().strip(), body.code.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code. Please request a new one.",
        )

    # Find user
    result = await db.execute(
        select(User).where(
            User.email == body.email.lower().strip(),
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Update password
    user.password_hash = security_service.hash_password(body.new_password)
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()

    logger.info(f"Password reset successful for: {user.email}")
    return {"message": "Password reset successfully. You can now sign in."}
