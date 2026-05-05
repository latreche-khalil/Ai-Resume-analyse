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
    
    title: str = Field(..., min_length=5, max_length=255, description="Job title")
    description: str = Field(..., min_length=10, description="Job description (min 10 characters)")
    required_skills: List[str] = Field(default_factory=list, description="Required skills")
    preferred_skills: Optional[List[str]] = Field(default_factory=list, description="Preferred skills")
    experience_level: Optional[Literal['entry', 'mid', 'senior', 'expert']] = None
    education_requirements: Optional[dict] = None
    work_arrangement: Optional[Literal['remote', 'hybrid', 'onsite']] = None
    salary_range_min: Optional[int] = None
    salary_range_max: Optional[int] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "Senior Full Stack Developer",
                "description": "We are seeking an experienced Full Stack Developer...",
                "required_skills": ["Python", "React", "PostgreSQL"],
                "preferred_skills": ["Docker", "AWS", "Kubernetes"],
                "experience_level": "senior",
                "work_arrangement": "hybrid",
                "salary_range_min": 80000,
                "salary_range_max": 120000
            }
        }


class JobDescriptionUpdate(BaseModel):
    """Schema for updating job description."""
    
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    description: Optional[str] = Field(None, min_length=100)
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_level: Optional[Literal['entry', 'mid', 'senior', 'expert']] = None
    education_requirements: Optional[dict] = None
    work_arrangement: Optional[Literal['remote', 'hybrid', 'onsite']] = None
    salary_range_min: Optional[int] = None
    salary_range_max: Optional[int] = None
    is_active: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "required_skills": ["Python", "React", "PostgreSQL", "Redis"],
                "is_active": True
            }
        }


class JobDescriptionResponse(BaseModel):
    """Schema for job description response."""
    
    id: UUID
    recruiter_id: Optional[UUID]
    title: str
    company: Optional[str] = None   # derived from recruiter profile or JD title
    description: str
    required_skills: List[str]
    preferred_skills: List[str]
    experience_level: Optional[str]
    education_requirements: Optional[dict]
    work_arrangement: Optional[str]
    salary_range_min: Optional[int]
    salary_range_max: Optional[int]
    is_active: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "recruiter_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Senior Full Stack Developer",
                "description": "We are seeking...",
                "required_skills": ["Python", "React", "PostgreSQL"],
                "preferred_skills": ["Docker", "AWS"],
                "experience_level": "senior",
                "work_arrangement": "hybrid",
                "is_active": True,
                "is_archived": False,
                "created_at": "2024-01-15T10:00:00Z",
                "updated_at": "2024-01-15T10:00:00Z"
            }
        }


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
