"""
Batch Ranking Result model.

Persists recruiter batch analysis results to the database
instead of browser localStorage.
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import String, ForeignKey, JSON, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin, UUIDType


class BatchRankingResult(Base, UUIDMixin, TimestampMixin):
    """
    Stores a single batch ranking session result.
    Each session contains the leaderboard + metadata for one
    recruiter → JD → [CVs] analysis run.
    """
    __tablename__ = "batch_ranking_results"

    # Who ran it
    recruiter_id: Mapped[UUID] = mapped_column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Which JD was used
    jd_id: Mapped[Optional[UUID]] = mapped_column(
        UUIDType(),
        ForeignKey("job_descriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Human-readable title (snapshot of JD title at the time)
    jd_title: Mapped[str] = mapped_column(String(500), nullable=False)

    # Number of CVs that were ranked
    cv_count: Mapped[int] = mapped_column(nullable=False, default=0)

    # Best candidate filename & score (for quick display in history list)
    best_candidate: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    best_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Full leaderboard + comparison JSON (the complete API response)
    result_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    recruiter = relationship("User", backref="batch_ranking_results")
    job_description = relationship("JobDescription")

    __table_args__ = (
        Index("idx_batch_ranking_recruiter", "recruiter_id"),
        Index("idx_batch_ranking_recruiter_created", "recruiter_id", "created_at"),
    )
