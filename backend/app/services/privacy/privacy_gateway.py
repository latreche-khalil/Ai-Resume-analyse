"""
Privacy Gateway Orchestrator.

Coordinates PII detection, masking, and audit logging.
Enforces architecturally that AI agents NEVER receive unmasked PII.

Requirements: 4.1, 4.8, 5.5, 5.6, 5.9
"""
import re
import time
import functools
from typing import Dict, Any, Optional, List, Tuple, Callable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.privacy.pii_detector import pii_detector, PIIEntity
from app.services.privacy.pii_tokenizer import tokenizer
from app.services.privacy.audit_trail import audit_trail_service
from app.models.pii_mapping import PIIMapping
from app.models.dlq_record import DLQRecord
from app.utils.logger import logger


# ── Architectural enforcement ──────────────────────────────────────────────────

# Regex that detects raw PII tokens that should have been masked
_PII_LEAK_PATTERNS = [
    re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'),   # email
    re.compile(r'\b\d{3}-\d{2}-\d{4}\b'),                                   # SSN
    re.compile(r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'), # US phone
]

def _contains_raw_pii(text: str) -> bool:
    """Return True if text contains detectable raw PII (email, SSN, phone)."""
    return any(p.search(text) for p in _PII_LEAK_PATTERNS)


def require_masked_text(param_name: str = "masked_cv"):
    """
    Decorator that raises RuntimeError if the named parameter contains raw PII.
    Enforces Privacy-by-Design at the architectural level.
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            text = kwargs.get(param_name)
            if text and isinstance(text, str) and _contains_raw_pii(text):
                logger.error(
                    f"PRIVACY VIOLATION: {func.__qualname__} received unmasked PII "
                    f"in '{param_name}'. Blocking call."
                )
                raise RuntimeError(
                    f"Privacy violation: '{param_name}' contains unmasked PII. "
                    "Run text through privacy_gateway.mask_pii() first."
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


class PrivacyGateway:
    """
    Privacy Gateway orchestrator for PII operations.
    
    Coordinates:
    - PII detection using Presidio
    - PII masking and tokenization
    - Audit trail logging
    - Legal basis verification
    
    Requirements: 4.1, 4.8, 5.5, 5.6, 5.9
    """
    
    # Performance target: 2-page CV within 30 seconds (local deep analysis)
    PERFORMANCE_TARGET_SECONDS = 30.0
    
    async def detect_pii(
        self,
        text: str,
        language: str = 'en'
    ) -> List[PIIEntity]:
        """
        Detect PII entities in text.
        
        Args:
            text: Text to analyze
            language: Language code (ar, en, fr)
            
        Returns:
            List of detected PII entities
            
        Requirements: 4.1
        """
        start_time = time.time()
        
        try:
            entities = pii_detector.detect_pii(text, language)
            
            elapsed_time = time.time() - start_time
            logger.info(
                f"PII detection completed in {elapsed_time:.2f}s "
                f"({len(entities)} entities detected)"
            )
            
            return entities
            
        except Exception as e:
            logger.error(f"PII detection failed: {str(e)}")
            raise
    
    async def mask_pii(
        self,
        text: str,
        user_id: UUID,
        document_id: Optional[UUID],
        language: str,
        db: AsyncSession,
        ip_address: Optional[str] = None
    ) -> Tuple[str, List[PIIMapping]]:
        """
        Detect and mask PII in text.
        
        This is the main entry point for processing documents through
        the Privacy Gateway.
        
        Args:
            text: Original text
            user_id: User ID
            document_id: Document ID
            language: Language code
            db: Database session
            ip_address: IP address for audit logging
            
        Returns:
            Tuple of (masked_text, pii_mappings)
            
        Requirements: 4.1, 4.8, 5.1, 5.2, 5.3, 5.4, 5.9
        """
        start_time = time.time()
        
        try:
            # Step 1: Detect PII
            entities = await self.detect_pii(text, language)
            
            # Step 2: Log PII detection (non-critical - skip on error)
            if document_id:
                try:
                    await audit_trail_service.log_pii_detection(
                        db=db,
                        user_id=user_id,
                        document_id=document_id,
                        entities_detected=len(entities),
                        entities_flagged=len([e for e in entities if e.flagged_for_review]),
                        language=language,
                        ip_address=ip_address
                    )
                except Exception as audit_err:
                    logger.warning(f"Audit log failed (non-critical): {audit_err}")
            
            # Step 3: Mask PII
            masked_text, pii_mappings = await tokenizer.mask_pii(
                text=text,
                entities=entities,
                user_id=user_id,
                document_id=document_id,
                db=db
            )
            
            # Step 4: Security Check - Monitor for anomalous PII volume
            if len(pii_mappings) > 100: # Configuration-based threshold
                await self._route_to_dlq(
                    db=db,
                    user_id=user_id,
                    job_type="pii_masking",
                    failure_type="security_violation",
                    failure_reason=f"Anomalous PII count: {len(pii_mappings)} entities detected.",
                    payload={"document_id": str(document_id), "pii_count": len(pii_mappings)}
                )
                logger.warning(f"Security Alert: High PII count for document {document_id}. Routed to DLQ.")

            # Step 5: Granular PII Audit Logging (non-critical)
            for mapping in pii_mappings:
                try:
                    await audit_trail_service.log_pii_action(
                        db=db,
                        user_id=user_id,
                        action="MASKED",
                        purpose="Document Ingestion",
                        document_id=document_id,
                        mapping_id=mapping.id,
                        ip_address=ip_address
                    )
                except Exception as audit_err:
                    logger.warning(f"PII audit log failed (non-critical): {audit_err}")
                    break  # Skip remaining if first fails
            
            elapsed_time = time.time() - start_time
            
            # Check performance target
            if elapsed_time > self.PERFORMANCE_TARGET_SECONDS:
                logger.warning(
                    f"Privacy Gateway processing exceeded target: "
                    f"{elapsed_time:.2f}s > {self.PERFORMANCE_TARGET_SECONDS}s"
                )
            else:
                logger.info(
                    f"Privacy Gateway processing completed in {elapsed_time:.2f}s"
                )
            
            return masked_text, pii_mappings
            
        except Exception as e:
            logger.error(f"Privacy Gateway masking failed: {str(e)}")
            raise
    
    async def unmask_pii(
        self,
        masked_text: str,
        user_id: UUID,
        document_id: UUID,
        legal_basis: str,
        requester_id: UUID,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> str:
        """
        Unmask PII with legal basis verification.
        
        Args:
            masked_text: Text with masked tokens
            user_id: Owner user ID
            document_id: Document ID
            legal_basis: Legal basis for unmasking
            requester_id: ID of user requesting unmasking
            db: Database session
            ip_address: IP address for audit logging
            user_agent: User agent for audit logging
            
        Returns:
            Unmasked text
            
        Requirements: 5.5, 5.6, 5.9
        """
        try:
            # Verify legal basis is provided
            if not legal_basis:
                raise ValueError("Legal basis required for PII unmasking")
            
            # Log unmasking attempt
            await audit_trail_service.log_pii_unmasking(
                db=db,
                user_id=user_id,
                document_id=document_id,
                legal_basis=legal_basis,
                requester_id=requester_id,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Unmask PII
            unmasked_text = await tokenizer.unmask_pii(
                masked_text=masked_text,
                user_id=user_id,
                db=db,
                legal_basis=legal_basis
            )
            
            logger.info(
                f"PII unmasked for document {document_id} "
                f"by user {requester_id} with legal basis: {legal_basis}"
            )
            
            # Log granular PII unmasking
            await audit_trail_service.log_pii_action(
                db=db,
                user_id=requester_id,
                action="UNMASKED",
                purpose=f"Recruiter Review: {legal_basis}",
                document_id=document_id,
                legal_basis=legal_basis,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            return unmasked_text
            
        except Exception as e:
            logger.error(f"Privacy Gateway unmasking failed: {str(e)}")
            raise
    
    async def unmask_pii_for_owner(
        self,
        masked_text: str,
        pii_mappings: List[PIIMapping],
        user_id: UUID,
        db: AsyncSession
    ) -> str:
        """
        Unmask PII for document owner (simplified version).
        
        This method is used when the document owner wants to view their own data.
        No legal basis required since it's their own data.
        
        Args:
            masked_text: Text with masked tokens
            pii_mappings: List of PII mappings
            user_id: Owner user ID
            db: Database session
            
        Returns:
            Unmasked text
            
        Requirements: Privacy Gateway Stage 3
        """
        try:
            unmasked_text = masked_text
            
            # Replace each token with decrypted original value
            for mapping in pii_mappings:
                try:
                    # Decrypt original value
                    original_value = tokenizer.decrypt(mapping.encrypted_value)
                    
                    # Replace token with original
                    unmasked_text = unmasked_text.replace(mapping.token, original_value)
                    
                    # Log access (non-critical)
                    try:
                        await audit_trail_service.log_pii_action(
                            db=db,
                            user_id=user_id,
                            action="VIEWED",
                            purpose="Owner Access",
                            document_id=mapping.document_id,
                            mapping_id=mapping.id
                        )
                    except Exception as audit_err:
                        logger.warning(f"Audit log failed (non-critical): {audit_err}")
                        
                except Exception as decrypt_err:
                    logger.error(f"Failed to decrypt PII mapping {mapping.id}: {decrypt_err}")
                    # Continue with other mappings
                    continue
            
            logger.info(f"PII unmasked for owner {user_id} ({len(pii_mappings)} mappings)")
            
            return unmasked_text
            
        except Exception as e:
            logger.error(f"Owner PII unmasking failed: {str(e)}")
            raise

    async def _route_to_dlq(
        self,
        db: AsyncSession,
        user_id: UUID,
        job_type: str,
        failure_type: str,
        failure_reason: str,
        payload: Dict[str, Any]
    ) -> None:
        """Route failed/suspicious tasks to the Dead Letter Queue."""
        try:
            dlq_entry = DLQRecord(
                user_id=user_id,
                job_type=job_type,
                failure_type=failure_type,
                failure_reason=failure_reason,
                payload=payload,
                status="pending"
            )
            db.add(dlq_entry)
            await db.commit()
        except Exception as e:
            logger.error(f"Failed to write to DLQ: {e}")
    
    async def audit_log(
        self,
        db: AsyncSession,
        user_id: UUID,
        operation: str,
        resource_type: str,
        resource_id: UUID,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None
    ) -> None:
        """
        Log operation to audit trail.
        
        Args:
            db: Database session
            user_id: User ID
            operation: Operation type
            resource_type: Resource type
            resource_id: Resource ID
            details: Additional details
            ip_address: IP address
            
        Requirements: 5.9
        """
        try:
            await audit_trail_service.log(
                db=db,
                user_id=user_id,
                operation=operation,
                resource_type=resource_type,
                resource_id=resource_id,
                details=details,
                ip_address=ip_address
            )
        except Exception as e:
            logger.error(f"Audit logging failed: {str(e)}")
            # Don't fail the operation if audit logging fails
    
    def get_flagged_entities(
        self,
        entities: List[PIIEntity]
    ) -> List[PIIEntity]:
        """
        Get entities flagged for manual review.
        
        Args:
            entities: List of PII entities
            
        Returns:
            List of flagged entities
        """
        return pii_detector.get_flagged_entities(entities)


# Global Privacy Gateway instance
privacy_gateway = PrivacyGateway()
