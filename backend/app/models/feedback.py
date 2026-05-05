"""
Feedback model for user feedback and quality tracking.

This module defines the Feedback model for collecting user feedback.
"""
from sqlalchemy import (
    Column, String, ForeignKey, Text, Integer,
    CheckConstraint, Index
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class Feedback(Base, UUIDMixin, TimestampMixin):
    """
    Feedback model for user feedback on analysis quality.
    
    Attributes:
        user_id: Foreign key to User
        analysis_record_id: Foreign key to AnalysisRecord (optional)
        rating: Rating (1-5 stars)
        feedback_text: Detailed feedback text
        feedback_type: Type of feedback
    """
    
    __tablename__ = "feedback"
    
    # Foreign keys
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who submitted feedback"
    )
    
    analysis_record_id = Column(
        UUIDType(),
        ForeignKey("analysis_records.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Analysis record being rated (optional)"
    )
    
    # Feedback content
    rating = Column(
        Integer,
        nullable=True,
        comment="Rating (1-5 stars)"
    )
    
    feedback_text = Column(
        Text,
        nullable=True,
        comment="Detailed feedback text"
    )
    
    feedback_type = Column(
        String(20),
        nullable=True,
        comment="Type: accuracy, extraction, matching, or general"
    )
    
    # Relationships
    user = relationship(
        "User",
        back_populates="feedback"
    )
    
    analysis_record = relationship(
        "AnalysisRecord",
        back_populates="feedback"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "rating IS NULL OR (rating >= 1 AND rating <= 5)",
            name="check_rating_range"
        ),
        CheckConstraint(
            "feedback_type IN ('accuracy', 'extraction', 'matching', 'general') OR feedback_type IS NULL",
            name="check_feedback_type"
        ),
        Index("idx_feedback_user_id", "user_id"),
        Index("idx_feedback_analysis_id", "analysis_record_id"),
        Index("idx_feedback_rating", "rating"),
    )
    
    def __repr__(self) -> str:
        return f"<Feedback(id={self.id}, rating={self.rating}, type={self.feedback_type})>"
