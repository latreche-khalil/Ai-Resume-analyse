"""
PII Audit Trail model for regulatory compliance (GDPR/APPI).

Detailed logging for every access to sensitive data.
Requirements: Class Diagram 3, Sequence Diagram 5
"""
from typing import Optional
from uuid import UUID
from sqlalchemy import String, ForeignKey, DateTime, Index, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone

from app.models.base import Base, UUIDMixin


class PIIAuditTrail(Base, UUIDMixin):
    """
    Detailed audit trail for PII access and masking operations.
    """
    __tablename__ = "pii_audit_trail"
    
    # Links
    mapping_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("pii_mappings.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="User who performed the action"
    )
    document_id: Mapped[Optional[UUID]] = mapped_column(
        ForeignKey("cv_documents.id", ondelete="SET NULL"),
        nullable=True
    )
    
    # Operation details
    action: Mapped[str] = mapped_column(
        String(50), 
        nullable=False,
        comment="Masked, Unmasked, Accessed, Deleted"
    )
    purpose: Mapped[str] = mapped_column(
        String(255), 
        nullable=False,
        comment="Reason for action (e.g., JD Matching, Recruiter Review)"
    )
    legal_basis: Mapped[Optional[str]] = mapped_column(
        String(255), 
        nullable=True,
        comment="GDPR Legal basis (e.g., Consent, Contract, Legitimate Interest)"
    )
    
    # Metadata
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Extensible metadata
    extra_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    user = relationship("User")
    mapping = relationship("PIIMapping")

    __table_args__ = (
        Index("idx_pii_audit_action", "action"),
        Index("idx_pii_audit_timestamp", "timestamp"),
    )
