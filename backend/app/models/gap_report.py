"""
Gap Report model for skill gap analysis.

This module defines the GapReport model with categorized gaps and learning roadmap.
"""
from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint, Index, Numeric, JSON
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class GapReport(Base, UUIDMixin, TimestampMixin):
    """
    Gap Report model containing skill gap analysis.
    
    Attributes:
        analysis_record_id: Foreign key to AnalysisRecord (unique)
        missing_skills: List of missing skills (legacy field)
        skill_gaps: Detailed skill gap analysis (legacy field)
        recommendations: Learning recommendations (legacy field)
        priority_skills: Priority skills to learn (legacy field)
        learning_resources: Learning resources (legacy field)
        critical_gaps: List of critical skill gaps
        important_gaps: List of important skill gaps
        nice_to_have_gaps: List of nice-to-have skill gaps
        learning_roadmap: Recommended learning path with resources
        estimated_time_weeks: Estimated time to close gaps (in weeks)
        quick_wins: Quick wins for immediate improvement
        competitive_differentiator: Competitive differentiator analysis
        total_potential_improvement: Total potential score improvement
    """
    
    __tablename__ = "gap_reports"
    
    # Foreign key
    analysis_record_id = Column(
        UUIDType(),
        ForeignKey("analysis_records.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="Analysis record this gap report belongs to"
    )
    
    # Categorized gaps (v3.2.0 - simplified and clear)
    critical_gaps = Column(
        JSON,
        nullable=True,
        default=list,
        comment="List of critical skill gaps (must-have for role)"
    )
    
    important_gaps = Column(
        JSON,
        nullable=True,
        default=list,
        comment="List of important skill gaps (highly desired)"
    )
    
    nice_to_have_gaps = Column(
        JSON,
        nullable=True,
        default=list,
        comment="List of nice-to-have skill gaps (bonus skills)"
    )
    
    # Learning recommendations
    learning_roadmap = Column(
        JSON,
        nullable=True,
        default=list,
        comment="Recommended learning path with courses, certifications, and resources"
    )
    
    estimated_time_weeks = Column(
        Integer,
        nullable=True,
        comment="Estimated time to close all gaps (in weeks)"
    )
    
    # Professional enhancement fields (newly added)
    quick_wins = Column(
        JSON,
        nullable=True,
        comment="Quick wins for immediate improvement"
    )
    
    competitive_differentiator = Column(
        JSON,
        nullable=True,
        comment="Competitive differentiator analysis"
    )
    
    total_potential_improvement = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Total potential score improvement"
    )
    
    # Relationships
    analysis_record = relationship(
        "AnalysisRecord",
        back_populates="gap_report"
    )
    
    # Constraints
    __table_args__ = (
        UniqueConstraint("analysis_record_id", name="unique_gap_report_per_analysis"),
        Index("idx_gap_reports_analysis_id", "analysis_record_id"),
    )
    
    def __repr__(self) -> str:
        return f"<GapReport(id={self.id}, analysis_id={self.analysis_record_id})>"
    
    @property
    def total_gaps(self) -> int:
        """Get total number of skill gaps."""
        critical = len(self.critical_gaps) if self.critical_gaps else 0
        important = len(self.important_gaps) if self.important_gaps else 0
        nice_to_have = len(self.nice_to_have_gaps) if self.nice_to_have_gaps else 0
        return critical + important + nice_to_have
    
    @property
    def has_critical_gaps(self) -> bool:
        """Check if there are any critical gaps."""
        return bool(self.critical_gaps)
