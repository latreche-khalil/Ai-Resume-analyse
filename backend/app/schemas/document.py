"""Document schemas."""
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


class CVDocumentCreate(BaseModel):
    """CV document creation schema."""
    original_filename: str
    file_format: str
    file_size_bytes: int


class CVDocumentUpdate(BaseModel):
    """CV document update schema."""
    detected_language: Optional[str] = None
    word_count: Optional[int] = None
    processing_status: Optional[str] = None
    virus_scan_status: Optional[str] = None


class CVDocumentResponse(BaseModel):
    """CV document response."""
    id: UUID
    original_filename: str
    file_format: str
    file_size_bytes: int
    detected_language: Optional[str]
    word_count: Optional[int]
    processing_status: str
    virus_scan_status: str
    latest_analysis_id: Optional[UUID] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class CVDocumentListResponse(BaseModel):
    """List of CV documents."""
    documents: List[CVDocumentResponse]
    total: int
    skip: int
    limit: int


class SkillReportResponse(BaseModel):
    """Skill report response."""
    id: UUID
    document_id: UUID
    skills: List[Dict[str, Any]]
    job_titles: List[Dict[str, Any]]
    companies: List[Dict[str, Any]]
    education: List[Dict[str, Any]]
    certifications: List[Dict[str, Any]]
    total_experience_months: Optional[int]
    extraction_confidence: Optional[float]
    flagged_for_review: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
