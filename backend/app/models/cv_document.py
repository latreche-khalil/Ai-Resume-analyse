"""
CV Document model for storing uploaded resumes.

This module defines the CVDocument model with file metadata and processing status.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import (
    Column, String, Integer, Numeric, Text, DateTime, ForeignKey,
    CheckConstraint, Index
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin, SoftDeleteMixin


class CVDocument(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    """
    CV Document model representing uploaded resumes.
    
    Attributes:
        user_id: Foreign key to User
        original_filename: Original filename of uploaded file
        file_path: Path to stored file
        file_size_bytes: File size in bytes (max 10MB)
        file_format: File format (pdf, docx, jpg, png)
        extracted_text: Extracted text from document
        masked_text: PII-masked version of extracted text
        detected_language: Detected language (ar, en, fr)
        word_count: Number of words in extracted text
        processing_status: Current processing status
        virus_scan_status: Virus scan result
        virus_scan_at: Timestamp of virus scan
        retention_until: Date when document will be auto-deleted
    """
    
    __tablename__ = "cv_documents"
    
    # Foreign keys
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who uploaded the document"
    )
    
    # File metadata
    original_filename = Column(
        String(255),
        nullable=False,
        comment="Original filename of uploaded file"
    )
    
    file_path = Column(
        String(500),
        nullable=False,
        comment="Path to stored file in uploads volume"
    )
    
    file_size_bytes = Column(
        Integer,
        nullable=False,
        comment="File size in bytes (max 10MB)"
    )
    
    file_format = Column(
        String(10),
        nullable=False,
        comment="File format: pdf, docx, jpg, or png"
    )
    
    # Extracted content
    extracted_text = Column(
        Text,
        nullable=True,
        comment="Extracted text from document"
    )
    
    masked_text = Column(
        Text,
        nullable=True,
        comment="PII-masked version of extracted text"
    )
    
    detected_language = Column(
        String(2),
        nullable=True,
        comment="Detected language: ar, en, or fr"
    )
    
    word_count = Column(
        Integer,
        nullable=True,
        comment="Number of words in extracted text"
    )

    lang_confidence = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Language detection confidence (0.00-1.00)"
    )
    
    # Processing status
    processing_status = Column(
        String(20),
        nullable=False,
        default='pending',
        index=True,
        comment="Processing status: pending, processing, completed, or failed"
    )

    status_message = Column(
        String(255),
        nullable=True,
        comment="Human-readable processing update (e.g., 'Using deep analysis...')"
    )
    
    # Virus scan
    virus_scan_status = Column(
        String(20),
        nullable=False,
        default='pending',
        comment="Virus scan status: pending, clean, or infected"
    )
    
    virus_scan_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of virus scan completion"
    )
    
    # Data retention
    retention_until = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc) + timedelta(days=90),
        comment="Date when document will be auto-deleted (90 days)"
    )
    
    # Relationships
    user = relationship(
        "User",
        back_populates="cv_documents"
    )
    
    skill_report = relationship(
        "SkillReport",
        back_populates="document",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    pii_mappings = relationship(
        "PIIMapping",
        back_populates="document",
        cascade="all, delete-orphan"
    )
    
    analysis_records = relationship(
        "AnalysisRecord",
        back_populates="cv_document",
        cascade="all, delete-orphan"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "file_format IN ('pdf', 'docx', 'jpg', 'png')",
            name="check_file_format"
        ),
        CheckConstraint(
            "detected_language IN ('ar', 'en', 'fr') OR detected_language IS NULL",
            name="check_detected_language"
        ),
        CheckConstraint(
            "processing_status IN ('pending', 'processing', 'completed', 'failed')",
            name="check_processing_status"
        ),
        CheckConstraint(
            "virus_scan_status IN ('pending', 'clean', 'infected')",
            name="check_virus_scan_status"
        ),
        CheckConstraint(
            "file_size_bytes <= 10485760",
            name="check_file_size_limit"
        ),
        Index("idx_cv_documents_user_id", "user_id"),
        Index("idx_cv_documents_status", "processing_status"),
        Index("idx_cv_documents_created_at", "created_at"),
        Index(
            "idx_cv_documents_retention",
            "retention_until",
            postgresql_where="deleted_at IS NULL"
        ),
    )
    
    def __repr__(self) -> str:
        return (
            f"<CVDocument(id={self.id}, filename={self.original_filename}, "
            f"status={self.processing_status})>"
        )
    
    @property
    def is_processed(self) -> bool:
        """Check if document has been successfully processed."""
        return self.processing_status == 'completed'
    
    @property
    def is_clean(self) -> bool:
        """Check if document passed virus scan."""
        return self.virus_scan_status == 'clean'
    
    def extend_retention(self, days: int = 90) -> None:
        """Extend retention period by specified days."""
        self.retention_until = datetime.now(timezone.utc) + timedelta(days=days)
