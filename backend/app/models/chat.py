"""
Chat models for AI career coaching.

This module defines ChatSession and ChatMessage models.
"""
from sqlalchemy import (
    Column, String, ForeignKey, Text, Boolean, Integer,
    CheckConstraint, Index
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class ChatSession(Base, UUIDMixin, TimestampMixin):
    """
    Chat Session model for coaching conversations.
    
    Attributes:
        user_id: Foreign key to User
        title: Session title
        context_data: Context data (skill report, gap report references)
        message_count: Number of messages in session
        is_active: Whether session is currently active
    """
    
    __tablename__ = "chat_sessions"
    
    # Foreign key
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who owns this chat session"
    )
    
    # Session details
    title = Column(
        String(255),
        nullable=True,
        comment="Session title"
    )
    
    context_data = Column(
        Text,
        nullable=True,
        comment="Context data: skill_report_id, gap_report_id, etc. (JSON as text for SQLite)"
    )
    
    message_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of messages in session (max 20)"
    )
    
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether session is currently active"
    )
    
    # Relationships
    user = relationship(
        "User",
        back_populates="chat_sessions"
    )
    
    messages = relationship(
        "ChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="ChatMessage.created_at"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "message_count <= 20",
            name="check_message_limit"
        ),
        Index("idx_chat_sessions_user_id", "user_id"),
        Index(
            "idx_chat_sessions_active",
            "is_active",
            postgresql_where="is_active = TRUE"
        ),
    )
    
    def __repr__(self) -> str:
        return f"<ChatSession(id={self.id}, user_id={self.user_id}, messages={self.message_count})>"
    
    @property
    def is_full(self) -> bool:
        """Check if session has reached message limit."""
        return self.message_count >= 20


class ChatMessage(Base, UUIDMixin, TimestampMixin):
    """
    Chat Message model for individual messages.
    
    Attributes:
        session_id: Foreign key to ChatSession
        role: Message role (user or assistant)
        content: Message content
        metadata: Additional message metadata
    """
    
    __tablename__ = "chat_messages"
    
    # Foreign key
    session_id = Column(
        UUIDType(),
        ForeignKey("chat_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Chat session this message belongs to"
    )
    
    # Message details
    role = Column(
        String(20),
        nullable=False,
        comment="Message role: user or assistant"
    )
    
    content = Column(
        Text,
        nullable=False,
        comment="Message content"
    )
    
    message_metadata = Column(
        Text,
        nullable=True,
        comment="Additional message metadata (JSON as text for SQLite)"
    )
    
    # Relationships
    session = relationship(
        "ChatSession",
        back_populates="messages"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "role IN ('user', 'assistant')",
            name="check_message_role"
        ),
        Index("idx_chat_messages_session_id", "session_id"),
        Index("idx_chat_messages_created_at", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<ChatMessage(id={self.id}, role={self.role})>"
