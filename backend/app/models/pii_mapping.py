"""
PII Mapping model for storing encrypted PII tokens.

This module defines the PIIMapping model for Privacy Gateway functionality.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy import (
    Column, String, ForeignKey, Boolean, LargeBinary,
    CheckConstraint, Index, UniqueConstraint, DateTime, Numeric
)
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class PIIMapping(Base, UUIDMixin, TimestampMixin):
    """
    PII Mapping model for storing encrypted PII with masked tokens.
    
    Attributes:
        user_id: Foreign key to User
        document_id: Foreign key to CVDocument (optional)
        masked_token: Masked token (e.g., NAME_1, EMAIL_2)
        entity_type: Type of PII entity
        encrypted_value: AES-256-GCM encrypted original value
        encryption_key_id: ID of encryption key used
        confidence_score: Detection confidence (0.0-1.0)
        flagged_for_review: Whether entity needs manual review
        retention_until: Date when mapping will be auto-deleted
    """
    
    __tablename__ = "pii_mappings"
    
    # Foreign keys
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who owns this PII"
    )
    
    document_id = Column(
        UUIDType(),
        ForeignKey("cv_documents.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Document containing this PII (optional)"
    )
    
    # Token and entity info
    masked_token = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Masked token (e.g., NAME_1, EMAIL_2)"
    )
    
    entity_type = Column(
        String(20),
        nullable=False,
        comment="Type of PII: NAME, EMAIL, PHONE, ADDRESS, ID_NUMBER, DATE_OF_BIRTH"
    )
    
    # Encrypted PII
    encrypted_value = Column(
        LargeBinary,
        nullable=False,
        comment="AES-256-GCM encrypted original PII value"
    )
    
    encryption_key_id = Column(
        String(50),
        nullable=False,
        comment="ID of encryption key used from key management service"
    )
    
    # blind_index = Column(
    #     String(64),
    #     nullable=True,
    #     index=True,
    #     comment="Fast search index (SHA-256 hash of original PII value)"
    # )
    
    # Detection metadata
    confidence_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Detection confidence score (0.00-1.00)"
    )
    
    flagged_for_review = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="Whether entity needs manual review (confidence < 0.7)"
    )
    
    # Data retention
    retention_until = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc) + timedelta(days=90),
        comment="Date when mapping will be auto-deleted (90 days)"
    )
    
    # Relationships
    user = relationship(
        "User",
        backref="pii_mappings"
    )
    
    document = relationship(
        "CVDocument",
        back_populates="pii_mappings"
    )
    
    # Constraints
    __table_args__ = (
        CheckConstraint(
            "entity_type IN ('NAME', 'EMAIL', 'PHONE', 'ADDRESS', 'ID_NUMBER', 'DATE_OF_BIRTH')",
            name="check_entity_type"
        ),
        CheckConstraint(
            "confidence_score IS NULL OR (confidence_score >= 0.00 AND confidence_score <= 1.00)",
            name="check_confidence_score_range"
        ),
        UniqueConstraint(
            "user_id", "masked_token",
            name="unique_masked_token_per_user"
        ),
        Index("idx_pii_mappings_user_id", "user_id"),
        Index("idx_pii_mappings_document_id", "document_id"),
        Index("idx_pii_mappings_token", "masked_token"),
        Index(
            "idx_pii_mappings_flagged",
            "flagged_for_review",
            postgresql_where="flagged_for_review = TRUE"
        ),
    )
    
    def __repr__(self) -> str:
        return (
            f"<PIIMapping(id={self.id}, token={self.masked_token}, "
            f"type={self.entity_type})>"
        )
    
    @property
    def needs_review(self) -> bool:
        """Check if PII detection needs manual review."""
        return self.flagged_for_review or (
            self.confidence_score is not None and self.confidence_score < 0.7
        )
