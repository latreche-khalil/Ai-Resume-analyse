"""Analysis schemas."""
from typing import List, Dict, Any, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class AnalysisCreateRequest(BaseModel):
    """Request to create analysis."""
    cv_document_id: UUID
    job_description_id: UUID


class AnalysisRequest(BaseModel):
    """Request to create analysis."""
    cv_document_id: UUID
    job_description_id: UUID
    response_language: str = Field(
        default="en",
        description="Language for analysis results (en/ar/fr)",
        pattern="^(en|ar|fr)$"
    )


class DocumentIngestionResponse(BaseModel):
    """Document ingestion response."""
    file_size_bytes: int
    file_format: str
    processing_status: str
    virus_scan_status: str


class TextExtractionResponse(BaseModel):
    """Text extraction response."""
    extracted_text_length: int
    masked_text_length: int
    detected_language: str
    word_count: int


class RAGPipelineResponse(BaseModel):
    """RAG pipeline response."""
    chunks_created: int
    embeddings_generated: int


class CVProcessingResponse(BaseModel):
    """CV processing response."""
    document_id: UUID
    pii_entities_masked: int
    skills_extracted: int
    chunks_created: int
    extraction_confidence: float
    flagged_for_review: bool


class SemanticSearchResult(BaseModel):
    """Semantic search result."""
    id: str
    text: str
    similarity: float
    distance: float
    metadata: Dict[str, Any]


class SemanticSearchResponse(BaseModel):
    """Semantic search response."""
    query: str
    results_count: int
    results: List[SemanticSearchResult]


class EnhancedAnalysisResponse(BaseModel):
    """Enhanced analysis response with pipeline details."""
    # Basic analysis info
    id: UUID
    cv_document_id: UUID
    job_description_id: UUID
    match_score: Optional[float]
    processing_status: str
    
    # Pipeline processing details
    document_ingestion: Optional[DocumentIngestionResponse]
    text_extraction: Optional[TextExtractionResponse]
    rag_pipeline: Optional[RAGPipelineResponse]
    cv_processing: Optional[CVProcessingResponse]
    semantic_search: Optional[SemanticSearchResponse]
    
    # Analysis results
    matching_skills: Optional[List[str]]
    missing_skills: Optional[List[str]]
    transferable_skills: Optional[List[str]]
    skills_by_category: Optional[Dict[str, List[Dict[str, Any]]]]
    
    # Professional fields
    seniority_alignment: Optional[Dict[str, Any]]
    cultural_fit_indicators: Optional[List[Dict[str, Any]]]
    competitive_advantage: Optional[Dict[str, Any]]
    red_flags: Optional[List[Dict[str, Any]]]
    hiring_urgency: Optional[str]
    
    # Reports
    gap_report: Optional[Dict[str, Any]]
    xai_report: Optional[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class AnalysisResponse(BaseModel):
    """Analysis response."""
    message: str
    status: str
    cv_document_id: UUID
    job_description_id: UUID


class AnalysisListResponse(BaseModel):
    """List of analyses."""
    analyses: List[Dict[str, Any]]
    total: int
    skip: int
    limit: int


class AnalysisRecordResponse(BaseModel):
    """Analysis record response."""
    id: UUID
    cv_document_id: UUID
    job_description_id: UUID
    match_score: Optional[float]
    processing_status: str
    
    class Config:
        from_attributes = True


class GapReportResponse(BaseModel):
    """Gap report response."""
    id: UUID
    analysis_record_id: UUID
    missing_skills: List[Dict[str, Any]]
    skill_gaps: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True


class XAIReportResponse(BaseModel):
    """XAI report response."""
    id: UUID
    analysis_record_id: UUID
    feature_importance: Dict[str, Any]
    positive_contributions: Dict[str, Any]
    negative_contributions: Dict[str, Any]
    counterfactuals: Dict[str, Any]
    
    class Config:
        from_attributes = True
