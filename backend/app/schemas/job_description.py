"""
Job Description schemas.

This module defines Pydantic schemas for job description operations.
"""
from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel, Field, validator


class JobDescriptionCreate(BaseModel):
    """Schema for creating job description."""
    
    title: str = Field(..., min_length=2, max_length=255, description="Job title")
    description: str = Field(..., min_length=10, description="Job description")
    company: Optional[str] = Field(None, max_length=255)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: Optional[List[str]] = Field(default_factory=list)
    experience_level: Optional[str] = None
    education_requirements: Optional[str] = None
    work_arrangement: Optional[str] = None
    salary_range_min: Optional[int] = None
    salary_range_max: Optional[int] = None

    class Config:
        extra = "ignore"


class JobDescriptionUpdate(BaseModel):
    """Schema for updating job description."""
    
    title: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    company: Optional[str] = Field(None, max_length=255)
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_level: Optional[str] = None
    education_requirements: Optional[str] = None
    work_arrangement: Optional[str] = None
    salary_range_min: Optional[int] = None
    salary_range_max: Optional[int] = None
    is_active: Optional[bool] = None

    class Config:
        extra = "ignore"


class JobDescriptionResponse(BaseModel):
    """Schema for job description response."""
    
    id: UUID
    recruiter_id: Optional[UUID] = None
    title: str
    company: Optional[str] = None
    description: str
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    experience_level: Optional[str] = None
    education_requirements: Optional[str] = None
    work_arrangement: Optional[str] = None
    salary_range_min: Optional[int] = None
    salary_range_max: Optional[int] = None
    is_active: bool = True
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        extra = "ignore"


class JobDescriptionListResponse(BaseModel):
    """Schema for paginated job description list response."""
    
    items: List[JobDescriptionResponse]
    total: int
    skip: int
    limit: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 10,
                "skip": 0,
                "limit": 20
            }
        }
