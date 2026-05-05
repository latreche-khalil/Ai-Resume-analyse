"""
HTTP Exception Helper Functions
Eliminates repetitive HTTPException patterns
"""
from fastapi import HTTPException, status


def raise_not_found(resource: str = "Resource") -> None:
    """
    Raise 404 Not Found exception.
    
    Usage:
        if not user:
            raise_not_found("User")
    """
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{resource} not found"
    )


def raise_bad_request(message: str) -> None:
    """
    Raise 400 Bad Request exception.
    
    Usage:
        raise_bad_request("Invalid email format")
    """
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=message
    )


def raise_unauthorized(message: str = "Unauthorized") -> None:
    """
    Raise 401 Unauthorized exception.
    
    Usage:
        raise_unauthorized("Invalid credentials")
    """
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message
    )


def raise_forbidden(message: str = "Forbidden") -> None:
    """
    Raise 403 Forbidden exception.
    
    Usage:
        raise_forbidden("Access denied")
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=message
    )


def raise_conflict(message: str) -> None:
    """
    Raise 409 Conflict exception.
    
    Usage:
        raise_conflict("Email already exists")
    """
    raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=message
    )


def raise_internal_error(message: str = "Internal server error") -> None:
    """
    Raise 500 Internal Server Error exception.
    
    Usage:
        raise_internal_error("Database connection failed")
    """
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=message
    )


def check_exists(condition: bool, resource: str = "Resource") -> None:
    """
    Check if resource exists, raise 404 if not.
    
    Usage:
        check_exists(user is not None, "User")
    """
    if not condition:
        raise_not_found(resource)
