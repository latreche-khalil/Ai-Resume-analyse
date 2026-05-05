"""
Pydantic schemas for request/response validation.

This package contains all Pydantic schemas organized by domain.
"""
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    TokenResponse,
    LoginRequest
)
from app.schemas.document import (
    CVDocumentCreate,
    CVDocumentResponse,
    SkillReportResponse
)
from app.schemas.job_description import (
    JobDescriptionCreate,
    JobDescriptionUpdate,
    JobDescriptionResponse
)
from app.schemas.analysis import (
    AnalysisCreateRequest,
    AnalysisRecordResponse,
    GapReportResponse,
    XAIReportResponse
)
from app.schemas.coaching import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatSessionResponse,
    InterviewSimulationStart,
    InterviewAnswerSubmit,
    InterviewEvaluationResponse,
    InterviewReportResponse
)
from app.schemas.recruiter import (
    RankingFilters,
    RankedCandidateResponse,
    ExportRequest
)
from app.schemas.task import (
    TaskResponse,
    BulkUploadResponse
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "TokenResponse",
    "LoginRequest",
    
    # Document schemas
    "CVDocumentCreate",
    "CVDocumentResponse",
    "SkillReportResponse",
    
    # Job description schemas
    "JobDescriptionCreate",
    "JobDescriptionUpdate",
    "JobDescriptionResponse",
    
    # Analysis schemas
    "AnalysisCreateRequest",
    "AnalysisRecordResponse",
    "GapReportResponse",
    "XAIReportResponse",
    
    # Coaching schemas
    "ChatMessageCreate",
    "ChatMessageResponse",
    "ChatSessionResponse",
    "InterviewSimulationStart",
    "InterviewAnswerSubmit",
    "InterviewEvaluationResponse",
    "InterviewReportResponse",
    
    # Recruiter schemas
    "RankingFilters",
    "RankedCandidateResponse",
    "ExportRequest",
    
    # Task schemas
    "TaskResponse",
    "BulkUploadResponse",
]
