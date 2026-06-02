"""
FastAPI dependencies for authentication and authorization.

This module provides:
- JWT token verification
- Current user extraction
- Role-based access control (RBAC)
- Audit logging for access attempts
"""
from typing import Optional, List
from uuid import UUID

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.auth.security import security_service
from app.models.user import User
from app.models.audit_log import AuditLog
from app.utils.logger import logger


# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
) -> User:
    """
    Extract and verify current user from JWT token.

    Accepts token from (in priority order):
    1. HttpOnly cookie  ``access_token``  (set by /auth/login)
    2. Authorization: Bearer <token>  header  (API clients / Swagger)

    Requirements: 1.7, 1.10, 1.8 (token blacklist)
    """
    from app.core.redis_client import redis_client

    # 1. Cookie (XSS-safe)
    token = request.cookies.get("access_token")

    # 2. Bearer header fallback
    if not token and credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if token is blacklisted (logged out)
    try:
        if await redis_client.is_token_blacklisted(token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Failed to check token blacklist: {e}")
        # Continue if Redis check fails (don't block authentication)

    # Verify token
    payload = security_service.verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Extract user ID from token
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Query user from database
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user.
    
    This is an alias for get_current_user for clarity in endpoint definitions.
    
    Requirements: 1.7
    """
    return current_user


class RoleChecker:
    """
    Dependency class for role-based access control.
    
    Usage:
        @router.get("/admin-only", dependencies=[Depends(RoleChecker(["admin"]))])
        async def admin_endpoint():
            ...
    
    Requirements: 20.9, 20.14
    """
    
    def __init__(self, allowed_roles: List[str]):
        """
        Initialize role checker with allowed roles.
        
        Args:
            allowed_roles: List of roles allowed to access the endpoint
        """
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        request: Request,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        """
        Check if current user has required role.
        
        Args:
            request: FastAPI request object
            current_user: Current authenticated user
            db: Database session
            
        Returns:
            Current user if authorized
            
        Raises:
            HTTPException: If user doesn't have required role
        """
        if current_user.role not in self.allowed_roles:
            # Log unauthorized access attempt
            await self._log_access_attempt(
                db=db,
                user=current_user,
                request=request,
                allowed=False
            )
            
            logger.warning(
                f"Unauthorized access attempt by user {current_user.email} "
                f"(role: {current_user.role}) to endpoint requiring roles: {self.allowed_roles}"
            )
            
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(self.allowed_roles)}"
            )
        
        # Log successful access
        await self._log_access_attempt(
            db=db,
            user=current_user,
            request=request,
            allowed=True
        )
        
        return current_user
    
    async def _log_access_attempt(
        self,
        db: AsyncSession,
        user: User,
        request: Request,
        allowed: bool
    ) -> None:
        try:
            audit_log = AuditLog(
                user_id=user.id,
                operation="ACCESS_ATTEMPT" if allowed else "ACCESS_DENIED",
                resource_type="ENDPOINT",
                resource_id=None,
                operation_metadata={
                    "endpoint": str(request.url.path),
                    "method": request.method,
                    "allowed_roles": self.allowed_roles,
                    "user_role": user.role,
                    "allowed": allowed
                },
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent")
            )
            db.add(audit_log)
            # Use flush instead of commit to avoid greenlet issues inside dependency
            await db.flush()
        except Exception as e:
            logger.error(f"Failed to log access attempt: {str(e)}")
            try:
                await db.rollback()
            except Exception:
                pass


# Convenience role checker instances
require_candidate = RoleChecker(["candidate"])
require_recruiter = RoleChecker(["recruiter"])
require_admin = RoleChecker(["admin"])
require_candidate_or_recruiter = RoleChecker(["candidate", "recruiter"])
require_recruiter_or_admin = RoleChecker(["recruiter", "admin"])
require_any_role = RoleChecker(["candidate", "recruiter", "admin"])


def require_role(role: str):
    """
    Create a role checker for a specific role.
    
    Args:
        role: Required role (candidate, recruiter, or admin)
        
    Returns:
        RoleChecker instance
        
    Usage:
        @router.get("/endpoint", dependencies=[Depends(require_role("recruiter"))])
    """
    return RoleChecker([role])


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    
    Useful for endpoints that work differently for authenticated vs anonymous users.
    
    Args:
        request: FastAPI request object
        db: Database session
        
    Returns:
        Current user if authenticated, None otherwise
    """
    # Check for Authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "")
    
    # Verify token
    payload = security_service.verify_token(token)
    
    if not payload:
        return None
    
    # Extract user ID
    user_id_str = payload.get("sub")
    if not user_id_str:
        return None
    
    try:
        user_id = UUID(user_id_str)
    except ValueError:
        return None
    
    # Query user
    result = await db.execute(
        select(User).where(User.id == user_id, User.deleted_at.is_(None))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        return None
    
    return user
