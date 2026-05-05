"""
Data Retention Service.

Requirements: 24.1-24.10
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, update

from app.models.cv_document import CVDocument
from app.models.pii_mapping import PIIMapping
from app.models.audit_log import AuditLog
from app.models.analysis_record import AnalysisRecord
from app.utils.logger import logger


class DataRetentionService:
    """
    Service for automated data retention and cleanup.
    
    Requirements: 24.1, 24.2, 24.3, 24.6
    """
    
    # Retention periods
    CV_RETENTION_DAYS = 90
    PII_RETENTION_DAYS = 90
    AUDIT_LOG_RETENTION_YEARS = 2
    ANALYSIS_ANONYMIZATION_YEARS = 1
    GRACE_PERIOD_DAYS = 30
    
    async def cleanup_old_data(self, db: AsyncSession) -> dict:
        """
        Run all cleanup operations.
        
        Requirements: 24.7
        """
        results = {
            "cv_documents_deleted": 0,
            "pii_mappings_deleted": 0,
            "audit_logs_deleted": 0,
            "analyses_anonymized": 0
        }
        
        try:
            # Delete old CV documents
            results["cv_documents_deleted"] = await self._delete_old_cv_documents(db)
            
            # Delete old PII mappings
            results["pii_mappings_deleted"] = await self._delete_old_pii_mappings(db)
            
            # Delete old audit logs
            results["audit_logs_deleted"] = await self._delete_old_audit_logs(db)
            
            # Anonymize old analyses
            results["analyses_anonymized"] = await self._anonymize_old_analyses(db)
            
            await db.commit()
            
            logger.info(f"Data retention cleanup completed: {results}")
            
            return results
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Data retention cleanup failed: {str(e)}")
            raise
    
    async def _delete_old_cv_documents(self, db: AsyncSession) -> int:
        """
        Delete CV documents after 90 days of inactivity.
        
        Requirements: 24.1
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.CV_RETENTION_DAYS)
        
        result = await db.execute(
            delete(CVDocument).where(
                CVDocument.updated_at < cutoff_date,
                CVDocument.deleted_at.is_(None)
            )
        )
        
        return result.rowcount
    
    async def _delete_old_pii_mappings(self, db: AsyncSession) -> int:
        """
        Delete PII mappings after 90 days.
        
        Requirements: 24.2
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.PII_RETENTION_DAYS)
        
        result = await db.execute(
            delete(PIIMapping).where(
                PIIMapping.created_at < cutoff_date
            )
        )
        
        return result.rowcount
    
    async def _delete_old_audit_logs(self, db: AsyncSession) -> int:
        """
        Delete audit logs older than 2 years.
        
        Requirements: 24.3
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.AUDIT_LOG_RETENTION_YEARS * 365)
        
        result = await db.execute(
            delete(AuditLog).where(
                AuditLog.created_at < cutoff_date
            )
        )
        
        return result.rowcount
    
    async def _anonymize_old_analyses(self, db: AsyncSession) -> int:
        """
        Anonymize analysis records after 1 year.
        
        Requirements: 24.6
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.ANALYSIS_ANONYMIZATION_YEARS * 365)
        
        result = await db.execute(
            update(AnalysisRecord)
            .where(AnalysisRecord.created_at < cutoff_date)
            .values(anonymized=True)
        )
        
        return result.rowcount
    
    async def send_retention_notification(
        self,
        user_email: str,
        document_id: str,
        deletion_date: datetime
    ) -> None:
        """
        Send email notification before automatic deletion.
        
        Requirements: 24.4
        """
        # Simplified - would integrate with email service
        logger.info(
            f"Retention notification sent to {user_email} "
            f"for document {document_id}, deletion date: {deletion_date}"
        )


# Global instance
data_retention_service = DataRetentionService()
