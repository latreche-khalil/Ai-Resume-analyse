"""
User model for authentication and authorization.

This module defines the User model with role-based access control (RBAC).
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Boolean, DateTime, String, CheckConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin


class User(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    User model representing candidates, recruiters, and admins.
    
    Attributes:
        email: Unique email address (RFC 5322 compliant)
        password_hash: Bcrypt hashed password (cost factor 12)
        role: User role (candidate, recruiter, admin)
        first_name: User's first name
        last_name: User's last name
        preferred_language: User's preferred language (ar, en, fr)
        email_verified: Whether email has been verified
        is_active: Whether the account is active
        last_login_at: Timestamp of last successful login
    """
    
    __tablename__ = "users"
    
    # Core fields
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        comment="User's email address (RFC 5322 compliant)"
    )
    
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Bcrypt hashed password with cost factor 12"
    )
    
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
        comment="User role: candidate, recruiter, or admin"
    )
    
    # Profile fields
    first_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="User's first name"
    )
    
    last_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="User's last name"
    )
    
    preferred_language: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        default='en',
        comment="User's preferred language: ar, en, or fr"
    )
    
    # Status fields
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether the email has been verified"
    )
    
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        comment="Whether the account is active"
    )
    
    last_login_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of last successful login"
    )
    
    # Relationships - using noload to avoid eager loading
    cv_documents = relationship(
        "CVDocument",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload"
    )
    
    job_descriptions = relationship(
        "JobDescription",
        back_populates="recruiter",
        cascade="all, delete-orphan",
        lazy="noload"
    )
    
    chat_sessions = relationship(
        "ChatSession",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload"
    )
    
    interview_sessions = relationship(
        "InterviewSession",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload"
    )
    
    audit_logs = relationship(
        "AuditLog",
        back_populates="user",
        lazy="noload"
    )
    
    feedback = relationship(
        "Feedback",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload"
    )
    
    testimonials = relationship(
        "Testimonial",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="noload"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "role IN ('candidate', 'recruiter', 'admin')",
            name="check_user_role"
        ),
        CheckConstraint(
            "preferred_language IN ('ar', 'en', 'fr')",
            name="check_preferred_language"
        ),
        # Email format check removed for SQLite compatibility
        # PostgreSQL version uses: email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
        Index("idx_users_email", "email"),
        Index("idx_users_role", "role"),
        Index("idx_users_created_at", "created_at"),
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name or self.last_name or self.email
