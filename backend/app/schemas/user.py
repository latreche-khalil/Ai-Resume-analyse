"""
User schemas for request/response validation.

This module defines Pydantic schemas for user-related operations.
"""
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator
import re


class UserCreate(BaseModel):
    """Schema for user registration."""
    
    email: EmailStr = Field(..., description="User's email address (RFC 5322 compliant)")
    password: str = Field(
        ...,
        min_length=8,
        description="Password (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char)"
    )
    role: Literal['candidate', 'recruiter'] = Field(..., description="User role")
    first_name: Optional[str] = Field(None, max_length=100, description="First name")
    last_name: Optional[str] = Field(None, max_length=100, description="Last name")
    preferred_language: Literal['ar', 'en', 'fr'] = Field('en', description="Preferred language")
    
    @validator('password')
    def validate_password_complexity(cls, v):
        """Validate password meets complexity requirements."""
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[@$!%*?&]', v):
            raise ValueError('Password must contain at least one special character (@$!%*?&)')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "candidate@example.com",
                "password": "SecurePass123!",
                "role": "candidate",
                "first_name": "John",
                "last_name": "Doe",
                "preferred_language": "en"
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating user profile."""
    
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    preferred_language: Optional[Literal['ar', 'en', 'fr']] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "first_name": "Jane",
                "preferred_language": "fr"
            }
        }


class PasswordChangeRequest(BaseModel):
    """Schema for changing password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, description="New password")

    @validator('new_password')
    def validate_password_complexity(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[@$!%*?&]', v):
            raise ValueError('Password must contain at least one special character (@$!%*?&)')
        return v


class UserResponse(BaseModel):
    """Schema for user response."""
    
    id: UUID
    email: EmailStr
    role: str
    first_name: Optional[str]
    last_name: Optional[str]
    preferred_language: str
    email_verified: bool
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "candidate@example.com",
                "role": "candidate",
                "first_name": "John",
                "last_name": "Doe",
                "preferred_language": "en",
                "email_verified": True,
                "is_active": True,
                "created_at": "2024-01-15T10:00:00Z",
                "last_login_at": "2024-01-15T14:30:00Z"
            }
        }


class TokenResponse(BaseModel):
    """Schema for authentication token response."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(86400, description="Token expiry in seconds (24 hours)")
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 86400
            }
        }


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request."""
    
    refresh_token: str = Field(..., description="JWT refresh token")
    
    class Config:
        json_schema_extra = {
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            }
        }


class LoginRequest(BaseModel):
    """Schema for login request."""
    
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "candidate@example.com",
                "password": "SecurePass123!"
            }
        }
