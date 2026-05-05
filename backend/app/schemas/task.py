"""
Task schemas for async processing.

This module defines Pydantic schemas for task operations.
"""
from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class TaskResponse(BaseModel):
    """Schema for task status response."""
    
    task_id: str = Field(..., description="Celery task ID")
    status: Literal['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY']
    result: Optional[dict] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    retry_count: int = 0
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "COMPLETED",
                "result": {
                    "document_id": "123e4567-e89b-12d3-a456-426614174000",
                    "processing_time": 45.2
                },
                "error_message": None,
                "created_at": "2024-01-15T10:00:00Z",
                "started_at": "2024-01-15T10:00:01Z",
                "completed_at": "2024-01-15T10:00:46Z",
                "retry_count": 0
            }
        }


class BulkUploadResponse(BaseModel):
    """Schema for bulk upload response."""
    
    task_id: str = Field(..., description="Bulk upload task ID")
    total_files: int = Field(..., description="Total files uploaded")
    queued_files: int = Field(..., description="Files queued for processing")
    failed_files: list = Field(default_factory=list, description="Files that failed validation")
    
    class Config:
        json_schema_extra = {
            "example": {
                "task_id": "550e8400-e29b-41d4-a716-446655440000",
                "total_files": 45,
                "queued_files": 45,
                "failed_files": []
            }
        }
