"""
Skill Report model for storing extracted CV data.

This module defines the SkillReport model with structured extraction results.
"""
from sqlalchemy import (
    Column, ForeignKey, Boolean, Numeric, UniqueConstraint, Index, Integer, JSON
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class SkillReport(Base, UUIDMixin, TimestampMixin):
    """
    Skill Report model containing extracted structured data from CV.
    
    Attributes:
        document_id: Foreign key to CVDocument (unique)
        skills: List of extracted skills with confidence scores
        job_titles: List of extracted job titles
        companies: List of companies worked at
        education: List of education qualifications
        certifications: List of professional certifications
        total_experience_months: Total work experience in months
        extraction_confidence: Overall extraction confidence
        flagged_for_review: Whether extraction needs manual review
    """
    
    __tablename__ = "skill_reports"
    
    # Foreign key
    document_id = Column(
        UUIDType(),
        ForeignKey("cv_documents.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="CV document this report belongs to"
    )
    
    # Extracted data (JSONB for flexibility)
    skills = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of extracted skills with confidence scores"
    )
    
    job_titles = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of extracted job titles (normalized to O*NET)"
    )
    
    companies = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of companies worked at"
    )
    
    education = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of education qualifications"
    )
    
    certifications = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of professional certifications"
    )
    
    # Experience
    total_experience_months = Column(
        Integer,
        nullable=True,
        comment="Total work experience in months"
    )
    
    # Quality metrics
    extraction_confidence = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Overall extraction confidence (0.00-1.00)"
    )
    
    flagged_for_review = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether extraction needs manual review (confidence < 0.6)"
    )
    
    # Relationships
    document = relationship(
        "CVDocument",
        back_populates="skill_report"
    )
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("document_id", name="unique_skill_report_per_document"),
        Index("idx_skill_reports_document_id", "document_id"),
        Index("idx_skill_reports_skills", "skills", postgresql_using="gin"),
    )
    
    def __repr__(self) -> str:
        return f"<SkillReport(id={self.id}, document_id={self.document_id})>"
    
    @property
    def skill_count(self) -> int:
        """Get number of extracted skills."""
        return len(self.skills) if self.skills else 0
    
    @property
    def needs_review(self) -> bool:
        """Check if extraction needs manual review."""
        return self.flagged_for_review or (
            self.extraction_confidence is not None and 
            self.extraction_confidence < 0.6
        )
