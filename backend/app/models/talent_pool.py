"""
Talent Pool model for Recruiters.

Enables recruiters to group and rank candidates for specific roles.
Requirements: Activity Diagram 3, Class Diagram 2
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy import String, ForeignKey, JSON, Index, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class TalentPool(Base, UUIDMixin, TimestampMixin):
    """
    Groups candidates for a specific recruitment project.
    """
    __tablename__ = "talent_pools"
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    
    # Ownership
    recruiter_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Link to a Job Description
    job_description_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("job_descriptions.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Configuration
    is_anonymized: Mapped[bool] = mapped_column(Boolean, default=True)
    ranking_criteria: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    recruiter = relationship("User", backref="talent_pools")
    job_description = relationship("JobDescription")
    
    # Association with CVs (Many-to-Many)
    # We use a separate association table for this
    candidates = relationship(
        "CVDocument",
        secondary="talent_pool_cvs",
        backref="talent_pools"
    )

    __table_args__ = (
        Index("idx_talent_pool_recruiter", "recruiter_id"),
    )


class TalentPoolCV(Base, TimestampMixin):
    """
    Association table between TalentPool and CVDocument.
    Includes ranking scores specific to this pool.
    """
    __tablename__ = "talent_pool_cvs"
    
    talent_pool_id: Mapped[UUID] = mapped_column(
        ForeignKey("talent_pools.id", ondelete="CASCADE"),
        primary_key=True
    )
    cv_document_id: Mapped[UUID] = mapped_column(
        ForeignKey("cv_documents.id", ondelete="CASCADE"),
        primary_key=True
    )
    
    # Match score snapshot
    pool_specific_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending") # pending, shortlisted, rejected
