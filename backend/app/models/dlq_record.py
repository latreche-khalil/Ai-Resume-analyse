"""
Dead Letter Queue (DLQ) model for failed or blocked operations.

Enables human-in-the-loop review for security violations or engine failures.
Requirements: Activity Diagram 5, Class Diagram 1
"""
from typing import Optional
from uuid import UUID
from sqlalchemy import String, ForeignKey, JSON, Integer, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class DLQRecord(Base, UUIDMixin, TimestampMixin):
    """
    Record of a failed or blocked task for manual intervention.
    """
    __tablename__ = "dlq_records"
    
    # Context
    job_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., 'pii_masking', 'matching'
    job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Celery task ID
    
    # Ownership
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Failure Details
    failure_reason: Mapped[str] = mapped_column(String(500), nullable=False)
    failure_type: Mapped[str] = mapped_column(String(50), nullable=False) # 'security_violation', 'engine_error'
    payload: Mapped[dict] = mapped_column(JSON, nullable=False) # Snapshot of data that failed
    
    # Resolution Status
    status: Mapped[str] = mapped_column(
        String(20), 
        default="pending",
        nullable=False
    ) # pending, reviewed, resolved, rejected
    resolution_notes: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    resolved_by: Mapped[Optional[UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    # Retry mechanism
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("idx_dlq_status", "status"),
        Index("idx_dlq_failure_type", "failure_type"),
    )
