"""
Interview models for AI interview simulation.

This module defines InterviewSession, InterviewQuestion, and InterviewAnswer models.
"""
from sqlalchemy import (
    Column, String, ForeignKey, Text, Integer, Numeric, DateTime, func,
    CheckConstraint, Index, UniqueConstraint, JSON
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class InterviewSession(Base, UUIDMixin, TimestampMixin):
    """
    Interview Session model for interview simulations.
    
    Attributes:
        user_id: Foreign key to User
        job_description_id: Foreign key to JobDescription (optional)
        overall_score: Overall interview performance score
        status: Session status
        started_at: When session started
        completed_at: When session completed
    """
    
    __tablename__ = "interview_sessions"
    
    # Foreign keys
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User participating in interview"
    )
    
    job_description_id = Column(
        UUIDType(),
        ForeignKey("job_descriptions.id", ondelete="SET NULL"),
        nullable=True,
        comment="Job description for role-specific questions"
    )
    
    # Performance
    overall_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Overall interview performance score (0.00-1.00)"
    )
    
    # Status
    status = Column(
        String(20),
        nullable=False,
        default='in_progress',
        index=True,
        comment="Session status: in_progress, completed, or abandoned"
    )
    
    started_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="When session started"
    )
    
    completed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="When session completed"
    )

    # Context storage (for AI adaptive logic)
    context_data = Column(
        Text,
        nullable=True,
        comment="Session settings: difficulty, type, mode, and analysis context (JSON string)"
    )
    
    # Relationships
    user = relationship(
        "User",
        back_populates="interview_sessions"
    )
    
    job_description = relationship(
        "JobDescription",
        back_populates="interview_sessions"
    )
    
    questions = relationship(
        "InterviewQuestion",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.sequence_number"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "overall_score IS NULL OR (overall_score >= 0.00 AND overall_score <= 1.00)",
            name="check_overall_score_range"
        ),
        CheckConstraint(
            "status IN ('in_progress', 'completed', 'abandoned')",
            name="check_session_status"
        ),
        Index("idx_interview_sessions_user_id", "user_id"),
        Index("idx_interview_sessions_status", "status"),
    )
    
    def __repr__(self) -> str:
        return f"<InterviewSession(id={self.id}, status={self.status})>"


class InterviewQuestion(Base, UUIDMixin, TimestampMixin):
    """
    Interview Question model for generated questions.
    
    Attributes:
        session_id: Foreign key to InterviewSession
        question_text: The question text
        question_type: Type of question
        difficulty_level: Difficulty level (1-10)
        sequence_number: Order in interview
    """
    
    __tablename__ = "interview_questions"
    
    # Foreign key
    session_id = Column(
        UUIDType(),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Interview session this question belongs to"
    )
    
    # Question details
    question_text = Column(
        Text,
        nullable=False,
        comment="The question text"
    )
    
    question_type = Column(
        String(20),
        nullable=True,
        comment="Question type: behavioral, technical, or situational"
    )
    
    difficulty_level = Column(
        Integer,
        nullable=True,
        comment="Difficulty level (1-10)"
    )
    
    sequence_number = Column(
        Integer,
        nullable=False,
        comment="Order in interview sequence"
    )
    
    # Relationships
    session = relationship(
        "InterviewSession",
        back_populates="questions"
    )
    
    answer = relationship(
        "InterviewAnswer",
        back_populates="question",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "question_type IN ('behavioral', 'technical', 'situational', 'adaptive') OR question_type IS NULL",
            name="check_question_type"
        ),
        CheckConstraint(
            "difficulty_level IS NULL OR (difficulty_level >= 1 AND difficulty_level <= 10)",
            name="check_difficulty_level"
        ),
        Index("idx_interview_questions_session_id", "session_id"),
    )
    
    def __repr__(self) -> str:
        return f"<InterviewQuestion(id={self.id}, type={self.question_type})>"


class InterviewAnswer(Base, UUIDMixin, TimestampMixin):
    """
    Interview Answer model for candidate responses.
    
    Attributes:
        question_id: Foreign key to InterviewQuestion (unique)
        answer_text: The answer text
        relevance_score: Relevance score (0.0-1.0)
        completeness_score: Completeness score (0.0-1.0)
        clarity_score: Communication clarity score (0.0-1.0)
        feedback: Feedback text
        strengths: List of strengths
        improvements: List of improvement suggestions
    """
    
    __tablename__ = "interview_answers"
    
    # Foreign key
    question_id = Column(
        UUIDType(),
        ForeignKey("interview_questions.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
        comment="Question this answer responds to"
    )
    
    # Answer
    answer_text = Column(
        Text,
        nullable=False,
        comment="The answer text"
    )
    
    # Evaluation scores
    relevance_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Relevance score (0.00-1.00)"
    )
    
    completeness_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Completeness score (0.00-1.00)"
    )
    
    clarity_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Communication clarity score (0.00-1.00)"
    )
    
    # Feedback
    feedback = Column(
        Text,
        nullable=True,
        comment="Feedback text"
    )
    
    strengths = Column(
        Text,
        nullable=True,
        comment="List of strengths identified (JSON string)"
    )
    
    improvements = Column(
        Text,
        nullable=True,
        comment="List of improvement suggestions (JSON string)"
    )
    
    # Relationships
    question = relationship(
        "InterviewQuestion",
        back_populates="answer"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "relevance_score IS NULL OR (relevance_score >= 0.00 AND relevance_score <= 1.00)",
            name="check_relevance_score_range"
        ),
        CheckConstraint(
            "completeness_score IS NULL OR (completeness_score >= 0.00 AND completeness_score <= 1.00)",
            name="check_completeness_score_range"
        ),
        CheckConstraint(
            "clarity_score IS NULL OR (clarity_score >= 0.00 AND clarity_score <= 1.00)",
            name="check_clarity_score_range"
        ),
        UniqueConstraint("question_id", name="unique_answer_per_question"),
        Index("idx_interview_answers_question_id", "question_id"),
    )
    
    def __repr__(self) -> str:
        return f"<InterviewAnswer(id={self.id}, question_id={self.question_id})>"
    
    @property
    def average_score(self) -> float:
        """Calculate average of all scores."""
        scores = [
            s for s in [self.relevance_score, self.completeness_score, self.clarity_score]
            if s is not None
        ]
        return sum(scores) / len(scores) if scores else 0.0
