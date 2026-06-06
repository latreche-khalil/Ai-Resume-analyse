"""
Analysis Record model for CV-JD matching results.

This module defines the AnalysisRecord model with match scores and skills analysis.
"""
from sqlalchemy import (
    Column, String, ForeignKey, Text, DateTime, Numeric, UniqueConstraint,
    CheckConstraint, Index, Boolean, JSON
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin

# Confidence threshold below which human review is required
HUMAN_REVIEW_CONFIDENCE_THRESHOLD = 0.70


class AnalysisRecord(Base, UUIDMixin, TimestampMixin):
    """
    Analysis Record model for CV-JD matching results.
    
    Attributes:
        cv_document_id: Foreign key to CVDocument
        job_description_id: Foreign key to JobDescription
        match_score: Overall match score (0.0-1.0)
        matching_skills: List of skills that match
        missing_skills: List of skills missing from CV
        transferable_skills: List of transferable skills
        processing_status: Current processing status
        processing_started_at: When processing started
        processing_completed_at: When processing completed
        error_message: Error message if processing failed
    """
    
    __tablename__ = "analysis_records"
    
    # Foreign keys
    cv_document_id = Column(
        UUIDType(),
        ForeignKey("cv_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="CV document being analyzed"
    )
    
    job_description_id = Column(
        UUIDType(),
        ForeignKey("job_descriptions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Job description being matched against"
    )
    
    # Match results
    match_score = Column(
        Numeric(3, 2),
        nullable=False,
        comment="Overall match score (0.00-1.00)"
    )
    
    matching_skills = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of skills that match between CV and JD"
    )
    
    missing_skills = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of skills in JD but missing from CV"
    )
    
    transferable_skills = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of transferable skills that could bridge gaps"
    )
    
    # Professional enhancement fields (simplified)
    seniority_alignment = Column(
        JSON,
        nullable=True,
        comment="Seniority level alignment analysis"
    )
    
    red_flags = Column(
        JSON,
        nullable=True,
        comment="Red flags detected"
    )
    
    hiring_urgency = Column(
        String(20),
        nullable=True,
        comment="Hiring urgency: move-fast, standard, take-time"
    )

    initiated_by_role = Column(
        String(20),
        nullable=True,
        default="candidate",
        comment="Role of user who initiated the analysis: candidate or recruiter"
    )
    
    # Human-in-the-Loop fields
    is_binding = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether AI decision is binding. Always False — human makes final call."
    )

    is_partial = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True when some agents failed but partial results are available"
    )

    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Reason for rejection (human reviewer or system)"
    )

    confidence_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="AI confidence in this analysis (0.00-1.00)"
    )

    requires_human_review = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Flagged for human review when confidence < threshold"
    )

    human_review_status = Column(
        String(20),
        nullable=True,
        comment="Human review status: pending_review, approved, rejected, overridden"
    )

    reviewed_by = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="User who reviewed this analysis"
    )

    reviewed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When the human review was completed"
    )

    reviewer_notes = Column(
        Text,
        nullable=True,
        comment="Notes from the human reviewer"
    )

    # Processing metadata
    processing_status = Column(
        String(20),
        nullable=False,
        default='pending',
        index=True,
        comment="Status: pending, processing, completed, failed, partial_done, rejected"
    )
    
    processing_started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When processing started"
    )
    
    processing_completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When processing completed"
    )
    
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if processing failed"
    )
    
    # Relationships
    cv_document = relationship(
        "CVDocument",
        back_populates="analysis_records"
    )
    
    job_description = relationship(
        "JobDescription",
        back_populates="analysis_records"
    )
    
    gap_report = relationship(
        "GapReport",
        back_populates="analysis_record",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    xai_report = relationship(
        "XAIReport",
        back_populates="analysis_record",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    feedback = relationship(
        "Feedback",
        back_populates="analysis_record",
        cascade="all, delete-orphan"
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewed_by],
        lazy="select"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "match_score >= 0.00 AND match_score <= 1.00",
            name="check_match_score_range"
        ),
        CheckConstraint(
            "processing_status IN ('pending', 'processing', 'completed', 'failed', 'partial_done', 'rejected')",
            name="check_processing_status"
        ),
        UniqueConstraint(
            "cv_document_id", "job_description_id",
            name="unique_cv_jd_pair"
        ),
        Index("idx_analysis_records_cv_id", "cv_document_id"),
        Index("idx_analysis_records_jd_id", "job_description_id"),
        Index("idx_analysis_records_match_score", "match_score"),
        Index("idx_analysis_records_status", "processing_status"),
    )
    
    def __repr__(self) -> str:
        return (
            f"<AnalysisRecord(id={self.id}, score={self.match_score}, "
            f"status={self.processing_status})>"
        )
    
    @property
    def is_completed(self) -> bool:
        """Check if analysis is completed."""
        return self.processing_status == 'completed'

    @property
    def owner_ref(self):
        """Owner UUID — derived from the linked CV document."""
        return self.cv_document.user_id if self.cv_document else None

    def mark_rejected(self, reason: str) -> None:
        """Mark analysis as rejected with a reason."""
        self.processing_status = 'rejected'
        self.rejection_reason = reason
        self.is_binding = False

    @property
    def needs_review(self) -> bool:
        """True when AI confidence is low and human must review before acting."""
        return bool(self.requires_human_review) and self.human_review_status in (None, 'pending_review')

    @property
    def human_approved(self) -> bool:
        """True only when a human explicitly approved this analysis."""
        return self.human_review_status == 'approved'
    
    @property
    def processing_duration_seconds(self) -> float:
        """Calculate processing duration in seconds."""
        if self.processing_started_at and self.processing_completed_at:
            delta = self.processing_completed_at - self.processing_started_at
            return delta.total_seconds()
        return 0.0
