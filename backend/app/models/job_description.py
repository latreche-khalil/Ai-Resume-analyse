"""
Job Description model for recruiter job postings.

This module defines the JobDescription model with required and preferred skills.
"""
from sqlalchemy import (
    Column, String, Text, ForeignKey, Boolean, Integer, Numeric,
    CheckConstraint, Index, JSON
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class JobDescription(Base, UUIDMixin, TimestampMixin):
    """
    Job Description model for recruiter job postings.
    
    Attributes:
        recruiter_id: Foreign key to User (recruiter role)
        title: Job title
        description: Full job description text
        required_skills: List of required skills
        preferred_skills: List of preferred/nice-to-have skills
        experience_level: Required experience level
        education_requirements: Education requirements
        work_arrangement: Work arrangement type
        salary_range_min: Minimum salary
        salary_range_max: Maximum salary
        is_active: Whether JD is currently active
        is_archived: Whether JD has been archived
    """
    
    __tablename__ = "job_descriptions"
    
    # Foreign key
    recruiter_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,  # Allow candidates to create JDs for analysis
        index=True,
        comment="Recruiter who created this job description (null for candidate-created JDs)"
    )
    
    # Job details
    title = Column(
        String(255),
        nullable=False,
        comment="Job title"
    )
    
    description = Column(
        Text,
        nullable=False,
        comment="Full job description text (minimum 100 words)"
    )
    
    # Skills
    required_skills = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of required skills"
    )
    
    preferred_skills = Column(
        JSON,
        nullable=False,
        default=list,
        comment="List of preferred/nice-to-have skills"
    )
    
    # Requirements
    experience_level = Column(
        String(20),
        nullable=True,
        comment="Required experience level: entry, mid, senior, or expert"
    )
    
    education_requirements = Column(
        JSON,
        nullable=True,
        comment="Education requirements"
    )
    
    work_arrangement = Column(
        String(20),
        nullable=True,
        comment="Work arrangement: remote, hybrid, or onsite"
    )
    
    # Compensation
    salary_range_min = Column(
        Integer,
        nullable=True,
        comment="Minimum salary"
    )
    
    salary_range_max = Column(
        Integer,
        nullable=True,
        comment="Maximum salary"
    )
    
    # Status
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether JD is currently active"
    )

    is_archived = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether JD has been archived"
    )

    is_long = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True when description exceeds 500 words"
    )

    word_count = Column(
        Integer,
        nullable=True,
        comment="Word count of the job description"
    )

    detected_language = Column(
        String(2),
        nullable=True,
        comment="Detected language: ar, en, or fr"
    )

    lang_confidence = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Language detection confidence (0.00-1.00)"
    )
    
    # Relationships
    recruiter = relationship(
        "User",
        back_populates="job_descriptions"
    )
    
    analysis_records = relationship(
        "AnalysisRecord",
        back_populates="job_description",
        cascade="all, delete-orphan"
    )
    
    interview_sessions = relationship(
        "InterviewSession",
        back_populates="job_description"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "experience_level IN ('entry', 'mid', 'senior', 'expert') OR experience_level IS NULL",
            name="check_experience_level"
        ),
        CheckConstraint(
            "work_arrangement IN ('remote', 'hybrid', 'onsite') OR work_arrangement IS NULL",
            name="check_work_arrangement"
        ),
        Index("idx_job_descriptions_recruiter_id", "recruiter_id"),
        Index(
            "idx_job_descriptions_active",
            "is_active",
            postgresql_where="is_active = TRUE"
        ),
        Index("idx_job_descriptions_created_at", "created_at"),
        Index("idx_job_descriptions_required_skills", "required_skills", postgresql_using="gin"),
    )
    
    def __repr__(self) -> str:
        return f"<JobDescription(id={self.id}, title={self.title})>"
    
    @property
    def total_skills(self) -> int:
        """Get total number of required and preferred skills."""
        required = len(self.required_skills) if self.required_skills else 0
        preferred = len(self.preferred_skills) if self.preferred_skills else 0
        return required + preferred
