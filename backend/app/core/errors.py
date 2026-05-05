"""
Structured error responses and error handling.

Requirements: 25.1, 25.2, 25.5
"""
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from uuid import uuid4

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Structured error response format."""
    
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    request_id: str
    timestamp: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "error_code": "VALIDATION_ERROR",
                "message": "Invalid input data",
                "details": {"field": "email", "error": "Invalid email format"},
                "request_id": "123e4567-e89b-12d3-a456-426614174000",
                "timestamp": "2024-01-15T10:00:00Z"
            }
        }


# Error codes
class ErrorCodes:
    """Standard error codes."""
    
    # Authentication errors
    AUTH_INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS"
    AUTH_TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED"
    AUTH_TOKEN_INVALID = "AUTH_TOKEN_INVALID"
    AUTH_TOKEN_REVOKED = "AUTH_TOKEN_REVOKED"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    VALIDATION_FILE_TOO_LARGE = "VALIDATION_FILE_TOO_LARGE"
    VALIDATION_INVALID_FORMAT = "VALIDATION_INVALID_FORMAT"
    
    # Resource errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    
    # Processing errors
    PROCESSING_FAILED = "PROCESSING_FAILED"
    PROCESSING_TIMEOUT = "PROCESSING_TIMEOUT"
    PROCESSING_VIRUS_DETECTED = "PROCESSING_VIRUS_DETECTED"
    
    # Permission errors
    PERMISSION_DENIED = "PERMISSION_DENIED"
    PERMISSION_INSUFFICIENT_ROLE = "PERMISSION_INSUFFICIENT_ROLE"
    
    # External service errors
    EXTERNAL_SERVICE_UNAVAILABLE = "EXTERNAL_SERVICE_UNAVAILABLE"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    EXTERNAL_RATE_LIMIT = "EXTERNAL_RATE_LIMIT"


def create_error_response(
    error_code: str,
    message: str,
    status_code: int,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> JSONResponse:
    """
    Create structured error response.
    
    Requirements: 25.1, 25.2
    """
    if not request_id:
        request_id = str(uuid4())
    
    error_response = ErrorResponse(
        error_code=error_code,
        message=message,
        details=details,
        request_id=request_id,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    
    return JSONResponse(
        status_code=status_code,
        content=error_response.model_dump()
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """
    Global HTTP exception handler.
    
    Requirements: 25.1, 25.5
    """
    # Map status codes to error codes
    error_code_map = {
        400: ErrorCodes.VALIDATION_ERROR,
        401: ErrorCodes.AUTH_TOKEN_INVALID,
        403: ErrorCodes.PERMISSION_DENIED,
        404: ErrorCodes.RESOURCE_NOT_FOUND,
        409: ErrorCodes.RESOURCE_CONFLICT,
        413: ErrorCodes.VALIDATION_FILE_TOO_LARGE,
        422: ErrorCodes.VALIDATION_ERROR,
        429: ErrorCodes.EXTERNAL_RATE_LIMIT,
        500: ErrorCodes.PROCESSING_FAILED,
        503: ErrorCodes.EXTERNAL_SERVICE_UNAVAILABLE
    }
    
    error_code = error_code_map.get(exc.status_code, "UNKNOWN_ERROR")
    
    return create_error_response(
        error_code=error_code,
        message=str(exc.detail),
        status_code=exc.status_code,
        request_id=request.state.request_id if hasattr(request.state, 'request_id') else None
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Global exception handler for unhandled exceptions.
    
    Requirements: 25.1
    """
    from app.utils.logger import logger
    
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return create_error_response(
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        status_code=500,
        request_id=request.state.request_id if hasattr(request.state, 'request_id') else None
    )
