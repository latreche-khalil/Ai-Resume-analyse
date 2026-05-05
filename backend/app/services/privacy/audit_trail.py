"""
Audit Trail Service for PII operations logging.

Requirements: 4.9, 5.9, 20.6, 20.14
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.pii_audit_trail import PIIAuditTrail
from app.utils.logger import logger


class AuditTrailService:
    """
    Service for logging PII operations and access attempts.
    
    Features:
    - Log PII detection, masking, and unmasking operations
    - 2-year retention period
    - Compliance tracking
    
    Requirements: 4.9, 5.9, 20.6, 20.14
    """
    
    # Retention period: 2 years
    RETENTION_YEARS = 2
    
    async def log(
        self,
        db: AsyncSession,
        user_id: Optional[UUID],
        operation: str,
        resource_type: str,
        resource_id: Optional[UUID],
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        legal_basis: Optional[str] = None
    ) -> AuditLog:
        """
        Log an operation to the audit trail.
        
        Args:
            db: Database session
            user_id: User performing the operation
            operation: Operation type (e.g., PII_DETECTION, PII_MASKING, PII_UNMASKING)
            resource_type: Type of resource (e.g., CV_DOCUMENT, PII_MAPPING)
            resource_id: ID of the resource
            details: Additional operation details
            ip_address: IP address of the request
            user_agent: User agent string
            legal_basis: Legal basis for the operation (required for PII unmasking)
            
        Returns:
            Created audit log entry
            
        Requirements: 4.9, 5.9, 20.6, 20.14
        """
        try:
            # Calculate retention date (2 years from now)
            retention_until = datetime.now(timezone.utc) + timedelta(days=365 * self.RETENTION_YEARS)
            
            # Create audit log entry
            audit_log = AuditLog(
                user_id=user_id,
                operation=operation,
                resource_type=resource_type,
                resource_id=resource_id,
                operation_metadata=details or {},
                ip_address=str(ip_address) if ip_address else None,
                user_agent=user_agent,
                legal_basis=legal_basis,
            )
            
            db.add(audit_log)
            await db.commit()
            await db.refresh(audit_log)
            
            logger.debug(
                f"Audit log created: {operation} on {resource_type} "
                f"by user {user_id}"
            )
            
            return audit_log
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {str(e)}")
            await db.rollback()
            raise
    
    async def log_pii_detection(
        self,
        db: AsyncSession,
        user_id: UUID,
        document_id: UUID,
        entities_detected: int,
        entities_flagged: int,
        language: str,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """
        Log PII detection operation.
        
        Requirements: 4.9
        """
        return await self.log(
            db=db,
            user_id=user_id,
            operation="PII_DETECTION",
            resource_type="CV_DOCUMENT",
            resource_id=document_id,
            details={
                "entities_detected": entities_detected,
                "entities_flagged": entities_flagged,
                "language": language,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            ip_address=ip_address
        )
    
    async def log_pii_masking(
        self,
        db: AsyncSession,
        user_id: UUID,
        document_id: UUID,
        entities_masked: int,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """
        Log PII masking operation.
        
        Requirements: 5.9
        """
        return await self.log(
            db=db,
            user_id=user_id,
            operation="PII_MASKING",
            resource_type="CV_DOCUMENT",
            resource_id=document_id,
            details={
                "entities_masked": entities_masked,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            ip_address=ip_address
        )
    
    async def log_pii_unmasking(
        self,
        db: AsyncSession,
        user_id: UUID,
        document_id: UUID,
        legal_basis: str,
        requester_id: UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """
        Log PII unmasking operation.
        
        Requirements: 5.9, 20.6
        """
        return await self.log(
            db=db,
            user_id=requester_id,
            operation="PII_UNMASKING",
            resource_type="CV_DOCUMENT",
            resource_id=document_id,
            details={
                "target_user_id": str(user_id),
                "requester_id": str(requester_id),
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            ip_address=ip_address,
            user_agent=user_agent,
            legal_basis=legal_basis
        )
    
    async def log_access_attempt(
        self,
        db: AsyncSession,
        user_id: UUID,
        resource_type: str,
        resource_id: UUID,
        allowed: bool,
        reason: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """
        Log resource access attempt.
        
        Requirements: 20.14
        """
        operation = "ACCESS_GRANTED" if allowed else "ACCESS_DENIED"
        
        return await self.log(
            db=db,
            user_id=user_id,
            operation=operation,
            resource_type=resource_type,
            resource_id=resource_id,
            details={
                "allowed": allowed,
                "reason": reason,
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            ip_address=ip_address
        )


    async def log_pii_action(
        self,
        db: AsyncSession,
        user_id: UUID,
        action: str,
        purpose: str,
        document_id: Optional[UUID] = None,
        mapping_id: Optional[UUID] = None,
        legal_basis: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra_details: Optional[Dict[str, Any]] = None
    ) -> PIIAuditTrail:
        """
        Create a granular PII audit trail entry.
        
        Requirements: Class Diagram 3, Sequence Diagram 5
        """
        try:
            audit_entry = PIIAuditTrail(
                user_id=user_id,
                mapping_id=mapping_id,
                document_id=document_id,
                action=action,
                purpose=purpose,
                legal_basis=legal_basis,
                ip_address=ip_address,
                user_agent=user_agent,
                extra_details=extra_details or {}
            )
            
            db.add(audit_entry)
            await db.commit()
            await db.refresh(audit_entry)
            
            return audit_entry
        except Exception as e:
            logger.error(f"Failed to log granular PII action: {e}")
            await db.rollback()
            raise


# Global audit trail service instance
audit_trail_service = AuditTrailService()
