"""
Celery Task models for async task tracking.

This module defines CeleryTask and DeadLetterQueue models.
"""
from sqlalchemy import (
    Column, String, ForeignKey, Text, Integer, DateTime,
    CheckConstraint, Index, UniqueConstraint, JSON
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class CeleryTask(Base, UUIDMixin, TimestampMixin):
    """
    Celery Task model for tracking async tasks.
    
    Attributes:
        task_id: Celery task ID (unique)
        task_name: Name of the task
        user_id: Foreign key to User (optional)
        status: Task status
        priority: Task priority
        result: Task result (JSON)
        error_message: Error message if failed
        retry_count: Number of retries attempted
        max_retries: Maximum retries allowed
        started_at: When task started
        completed_at: When task completed
    """
    
    __tablename__ = "celery_tasks"
    
    # Task identification
    task_id = Column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="Celery task ID"
    )
    
    task_name = Column(
        String(255),
        nullable=False,
        comment="Name of the task"
    )
    
    # User (optional)
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User who initiated the task"
    )
    
    # Status
    status = Column(
        String(20),
        nullable=False,
        default='PENDING',
        index=True,
        comment="Task status: PENDING, PROCESSING, COMPLETED, FAILED, RETRY"
    )
    
    priority = Column(
        String(10),
        nullable=False,
        default='NORMAL',
        comment="Task priority: HIGH, NORMAL, LOW"
    )
    
    # Results
    result = Column(
        JSON,
        nullable=True,
        comment="Task result (JSON)"
    )
    
    error_message = Column(
        Text,
        nullable=True,
        comment="Error message if task failed"
    )
    
    # Retry logic
    retry_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of retries attempted"
    )
    
    max_retries = Column(
        Integer,
        nullable=False,
        default=3,
        comment="Maximum retries allowed"
    )
    
    # Timing
    started_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When task started processing"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When task completed"
    )
    
    # Relationships
    user = relationship(
        "User",
        backref="celery_tasks"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRY')",
            name="check_task_status"
        ),
        CheckConstraint(
            "priority IN ('HIGH', 'NORMAL', 'LOW')",
            name="check_task_priority"
        ),
        UniqueConstraint("task_id", name="unique_task_id"),
        Index("idx_celery_tasks_task_id", "task_id"),
        Index("idx_celery_tasks_status", "status"),
        Index("idx_celery_tasks_user_id", "user_id"),
        Index("idx_celery_tasks_priority", "priority", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<CeleryTask(id={self.id}, task_id={self.task_id}, status={self.status})>"
    
    @property
    def is_completed(self) -> bool:
        """Check if task is completed."""
        return self.status == 'COMPLETED'
    
    @property
    def should_retry(self) -> bool:
        """Check if task should be retried."""
        return self.status == 'FAILED' and self.retry_count < self.max_retries


class DeadLetterQueue(Base, UUIDMixin, TimestampMixin):
    """
    Dead Letter Queue model for failed tasks.
    
    Attributes:
        task_id: Original Celery task ID
        task_name: Name of the task
        payload: Task payload (JSON)
        error_message: Error message
        stack_trace: Full stack trace
        retry_count: Number of retries attempted
        resolved_at: When issue was resolved
        resolution_notes: Notes about resolution
    """
    
    __tablename__ = "dead_letter_queue"
    
    # Task identification
    task_id = Column(
        String(255),
        nullable=False,
        comment="Original Celery task ID"
    )
    
    task_name = Column(
        String(255),
        nullable=False,
        comment="Name of the task"
    )
    
    # Task data
    payload = Column(
        JSON,
        nullable=False,
        comment="Task payload (arguments, kwargs)"
    )
    
    # Error details
    error_message = Column(
        Text,
        nullable=False,
        comment="Error message"
    )
    
    stack_trace = Column(
        Text,
        nullable=True,
        comment="Full stack trace"
    )
    
    retry_count = Column(
        Integer,
        nullable=False,
        comment="Number of retries attempted before DLQ"
    )
    
    # Resolution
    resolved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When issue was resolved"
    )
    
    resolution_notes = Column(
        Text,
        nullable=True,
        comment="Notes about how issue was resolved"
    )
    
    # Constraints
    __table_args__ = (
        Index("idx_dlq_created_at", "created_at"),
        Index(
            "idx_dlq_resolved",
            "resolved_at",
            postgresql_where="resolved_at IS NULL"
        ),
    )
    
    def __repr__(self) -> str:
        return f"<DeadLetterQueue(id={self.id}, task_id={self.task_id})>"
    
    @property
    def is_resolved(self) -> bool:
        """Check if issue has been resolved."""
        return self.resolved_at is not None
