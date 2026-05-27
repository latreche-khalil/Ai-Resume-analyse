"""
Pydantic schemas for testimonials
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class TestimonialBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    company: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=10, max_length=1000)
    rating: float = Field(..., ge=1.0, le=5.0)


class TestimonialCreate(TestimonialBase):
    pass


class TestimonialUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[str] = Field(None, max_length=100)
    company: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = Field(None, min_length=10, max_length=1000)
    rating: Optional[float] = Field(None, ge=1.0, le=5.0)
    is_featured: Optional[bool] = None
    is_approved: Optional[bool] = None
    is_verified: Optional[bool] = None


class TestimonialResponse(TestimonialBase):
    id: int
    user_id: Optional[UUID] = None
    is_featured: bool
    is_approved: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestimonialPublic(BaseModel):
    id: int
    name: str
    role: Optional[str] = None
    company: Optional[str] = None
    avatar_url: Optional[str] = None
    content: str
    rating: float
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
