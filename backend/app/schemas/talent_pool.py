from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TalentPoolBase(BaseModel):
    name: str
    description: Optional[str] = None
    job_description_id: Optional[UUID] = None
    is_anonymized: bool = True
    ranking_criteria: Optional[dict] = None


class TalentPoolCreate(TalentPoolBase):
    pass


class TalentPoolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_anonymized: Optional[bool] = None
    ranking_criteria: Optional[dict] = None


class TalentPoolCV(BaseModel):
    cv_document_id: UUID
    pool_specific_score: Optional[float] = None
    status: str = "pending"
    
    model_config = ConfigDict(from_attributes=True)


class TalentPoolRead(TalentPoolBase):
    id: UUID
    recruiter_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TalentPoolDetail(TalentPoolRead):
    candidates_count: int
    candidates: List[TalentPoolCV] = []
    
    model_config = ConfigDict(from_attributes=True)


# Batch Ranking Schemas
class BatchRankRequest(BaseModel):
    """Request for batch ranking candidates."""
    job_description_id: UUID
    ranking_criteria: Optional[dict] = None  # Optional custom weights


class CandidateRankingDetail(BaseModel):
    """Detailed ranking information for a single candidate."""
    rank: int
    cv_id: str
    filename: str
    composite_score: float
    rank_category: str  # Excellent, Good, Moderate, Weak
    scores_breakdown: dict
    matching_skills: List[str]
    missing_skills: List[str]
    recommendation: str
    seniority_alignment: dict
    competitive_advantage: dict


class BatchRankStatistics(BaseModel):
    """Statistics for the batch ranking results."""
    average_score: float
    highest_score: float
    lowest_score: float
    excellent_count: int
    good_count: int
    moderate_count: int
    weak_count: int


class BatchRankResponse(BaseModel):
    """Response containing ranked leaderboard."""
    job_description_id: str
    job_title: str
    total_candidates: int
    ranking_criteria: dict
    leaderboard: List[CandidateRankingDetail]
    statistics: BatchRankStatistics
