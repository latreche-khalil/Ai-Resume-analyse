"""
Audit Log model for compliance and security tracking.

This module defines the AuditLog model for tracking all sensitive operations.
"""
from sqlalchemy import Column, String, ForeignKey, Text, Numeric, CheckConstraint, Index, JSON
from app.models.base import UUIDType
from sqlalchemy.orm import relationship

from app.models.base import Base, UUIDMixin, TimestampMixin


class AuditLog(Base, UUIDMixin, TimestampMixin):
    """
    Audit Log model for tracking sensitive operations.
    
    Immutable append-only log with 2-year retention.
    
    Attributes:
        user_id: Foreign key to User (nullable for system operations)
        operation: Type of operation performed
        resource_type: Type of resource accessed
        resource_id: ID of resource accessed
        entity_type: Type of PII entity (for PII operations)
        confidence_score: Detection confidence (for PII operations)
        legal_basis: Legal basis for PII access
        ip_address: IP address of request
        user_agent: User agent string
        metadata: Additional operation metadata
    """
    
    __tablename__ = "audit_logs"
    
    # User (nullable for system operations)
    user_id = Column(
        UUIDType(),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="User who performed the operation (NULL for system operations)"
    )
    
    # Operation details
    operation = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type of operation: PII_DETECT, PII_MASK, PII_UNMASK, etc."
    )
    
    resource_type = Column(
        String(50),
        nullable=False,
        comment="Type of resource: cv_document, job_description, user, etc."
    )
    
    resource_id = Column(
        UUIDType(),
        nullable=True,
        comment="ID of resource accessed"
    )
    
    # PII-specific fields
    entity_type = Column(
        String(20),
        nullable=True,
        comment="Type of PII entity: NAME, EMAIL, PHONE, etc."
    )
    
    confidence_score = Column(
        Numeric(3, 2),
        nullable=True,
        comment="Detection confidence score (0.00-1.00)"
    )
    
    legal_basis = Column(
        String(100),
        nullable=True,
        comment="Legal basis for PII access (required for unmasking)"
    )
    
    # Request metadata
    ip_address = Column(
        String(45),  # IPv4 (15) or IPv6 (45)
        nullable=True,
        comment="IP address of request"
    )
    
    user_agent = Column(
        Text,
        nullable=True,
        comment="User agent string from request"
    )
    
    operation_metadata = Column(
        JSON,
        nullable=True,
        comment="Additional operation metadata"
    )
    
    # Relationships
    user = relationship(
        "User",
        back_populates="audit_logs"
    )
    
    # Constraints
    __table_args__ = (
        Index("idx_audit_logs_user_id", "user_id"),
        Index("idx_audit_logs_operation", "operation"),
        Index("idx_audit_logs_created_at", "created_at"),
        Index("idx_audit_logs_resource", "resource_type", "resource_id"),
    )
    
    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, operation={self.operation}, "
            f"resource={self.resource_type})>"
        )
    
    @property
    def is_pii_operation(self) -> bool:
        """Check if this is a PII-related operation."""
        return self.operation in ('PII_DETECT', 'PII_MASK', 'PII_UNMASK')
