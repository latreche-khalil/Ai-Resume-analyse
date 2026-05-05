"""
Recruiter schemas for talent pool management.

This module defines Pydantic schemas for recruiter operations.
"""
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel, Field, validator


class RankingFilters(BaseModel):
    """Schema for candidate ranking filters."""
    
    min_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Minimum match score")
    required_skills: Optional[List[str]] = Field(None, description="Required skills filter")
    experience_level: Optional[str] = Field(None, description="Experience level filter")
    education: Optional[str] = Field(None, description="Education level filter")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
    
    class Config:
        json_schema_extra = {
            "example": {
                "min_score": 0.7,
                "required_skills": ["Python", "React"],
                "experience_level": "senior",
                "page": 1,
                "page_size": 20
            }
        }


class RankedCandidateResponse(BaseModel):
    """Schema for ranked candidate response."""
    
    cv_document_id: UUID
    user_id: UUID
    match_score: float
    matching_skills: List[dict]
    missing_skills: List[dict]
    key_highlights: List[str]
    
    @validator('match_score')
    def validate_match_score(cls, v):
        """Validate match score is between 0.0 and 1.0."""
        if not 0.0 <= v <= 1.0:
            raise ValueError('Match score must be between 0.0 and 1.0')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "cv_document_id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "match_score": 0.92,
                "matching_skills": [
                    {"skill": "Python", "confidence": 0.95}
                ],
                "missing_skills": [
                    {"skill": "Docker", "severity": "important"}
                ],
                "key_highlights": [
                    "10 years experience",
                    "Led team of 5 developers"
                ]
            }
        }


class ExportRequest(BaseModel):
    """Schema for export request."""
    
    candidate_ids: List[UUID] = Field(..., max_items=100, description="Candidate IDs to export")
    format: Literal['pdf', 'csv'] = Field(..., description="Export format")
    anonymize: bool = Field(False, description="Exclude PII from export")
    fields: Optional[List[str]] = Field(None, description="Fields to include")
    
    @validator('candidate_ids')
    def validate_candidate_count(cls, v):
        """Validate candidate count doesn't exceed limit."""
        if len(v) > 100:
            raise ValueError('Cannot export more than 100 candidates at once')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "candidate_ids": [
                    "123e4567-e89b-12d3-a456-426614174000",
                    "123e4567-e89b-12d3-a456-426614174001"
                ],
                "format": "pdf",
                "anonymize": False,
                "fields": ["match_score", "skills", "experience", "xai_summary"]
            }
        }
