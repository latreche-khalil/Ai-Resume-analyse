"""
Coaching schemas for chat and interview simulation.

This module defines Pydantic schemas for coaching operations.
"""
from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class ChatMessageCreate(BaseModel):
    """Schema for creating chat message."""
    
    message: str = Field(..., min_length=1, max_length=2000, description="Message content")
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "What skills should I focus on to become a senior developer?"
            }
        }


class ChatMessageResponse(BaseModel):
    """Schema for chat message response."""
    
    id: UUID
    role: Literal['user', 'assistant']
    content: str
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "role": "assistant",
                "content": "Based on your skill report, I recommend focusing on...",
                "created_at": "2024-01-15T10:00:00Z"
            }
        }


class ChatSessionResponse(BaseModel):
    """Schema for chat session response."""
    
    id: UUID
    user_id: UUID
    title: Optional[str]
    message_count: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "title": "Career Path Discussion",
                "message_count": 8,
                "is_active": True,
                "created_at": "2024-01-15T10:00:00Z"
            }
        }


class InterviewSimulationStart(BaseModel):
    """Schema for starting interview simulation."""
    
    job_description_id: UUID = Field(..., description="Job description for role-specific questions")
    difficulty: Optional[str] = Field("mid", description="junior, mid, senior")
    interview_type: Optional[str] = Field("mixed", description="technical, behavioral, mixed")
    mode: Optional[str] = Field("training", description="training, test")
    
    class Config:
        json_schema_extra = {
            "example": {
                "job_description_id": "123e4567-e89b-12d3-a456-426614174000",
                "difficulty": "mid",
                "interview_type": "technical",
                "mode": "training"
            }
        }


class InterviewAnswerSubmit(BaseModel):
    """Schema for submitting interview answer."""
    
    question_id: UUID = Field(..., description="Question ID")
    answer_text: str = Field(..., min_length=1, description="Answer text")
    
    class Config:
        json_schema_extra = {
            "example": {
                "question_id": "123e4567-e89b-12d3-a456-426614174000",
                "answer": "In my previous role, I led a team of 5 developers..."
            }
        }


class InterviewEvaluationResponse(BaseModel):
    """Schema for interview answer evaluation."""
    
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    completeness_score: float = Field(..., ge=0.0, le=1.0)
    clarity_score: float = Field(..., ge=0.0, le=1.0)
    feedback: str
    strengths: List[str]
    improvements: List[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "relevance_score": 0.85,
                "completeness_score": 0.78,
                "clarity_score": 0.92,
                "feedback": "Your answer demonstrates strong leadership...",
                "strengths": ["Clear structure", "Specific examples"],
                "improvements": ["Could elaborate on outcomes", "Add metrics"]
            }
        }


class InterviewReportResponse(BaseModel):
    """Schema for interview performance report."""
    
    session_id: UUID
    overall_score: float
    questions_answered: int
    average_relevance: float
    average_completeness: float
    average_clarity: float
    strengths: List[str]
    areas_for_improvement: List[str]
    completed_at: datetime
    
    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "session_id": "123e4567-e89b-12d3-a456-426614174000",
                "overall_score": 0.82,
                "questions_answered": 7,
                "average_relevance": 0.85,
                "average_completeness": 0.78,
                "average_clarity": 0.83,
                "strengths": ["Strong communication", "Good examples"],
                "areas_for_improvement": ["Technical depth", "Quantify results"],
                "completed_at": "2024-01-15T11:30:00Z"
            }
        }
