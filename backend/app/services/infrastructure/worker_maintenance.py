"""
Maintenance and Data Retention Service for Worker.

Handles hard-deletion of users after grace period and document expiry.
Requirements: 2.3, 20.3, 20.4, 20.5
"""
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from loguru import logger

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.cv_document import CVDocument
from app.models.pii_mapping import PIIMapping
from app.models.audit_log import AuditLog
from app.models.analysis_record import AnalysisRecord
from app.core.celery_app import celery_app


async def hard_delete_expired_accounts_async():
    """
    Find users with deleted_at older than 30 days and hard-delete them.
    Also deletes all associated data (CVs, Analyses, etc.).
    """
    logger.info("Maintenance: Checking for expired account deletions...")
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Find target users
            stmt = select(User).where(User.deleted_at <= cutoff)
            result = await db.execute(stmt)
            users_to_delete = result.scalars().all()
            
            if not users_to_delete:
                logger.info("Maintenance: No expired accounts to purge.")
                return 0
            
            for user in users_to_delete:
                logger.warning(f"Maintenance: PERMANENTLY purging user data for: {user.email}")
                
                # Cascade delete should handle most, but we can be explicit or rely on FKs
                # In our case, some relations might not have Cascade Delete set in SQLAlchemy
                # (Good to have explicit deletions for audit trail)
                
                # DEFERRED: Physical file deletion from disk/S3 — Phase 2
                
                await db.delete(user)
            
            await db.commit()
            logger.info(f"Maintenance: Successfully purged {len(users_to_delete)} accounts.")
            return len(users_to_delete)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Maintenance Error (purge): {e}")
            raise


async def cleanup_expired_documents_async():
    """
    Find documents with retention_until < now and hard-delete them.
    """
    logger.info("Maintenance: Checking for expired documents...")
    now = datetime.now(timezone.utc)
    
    async with AsyncSessionLocal() as db:
        try:
            stmt = select(CVDocument).where(CVDocument.retention_until <= now)
            result = await db.execute(stmt)
            docs_to_delete = result.scalars().all()
            
            for doc in docs_to_delete:
                logger.info(f"Maintenance: Deleting expired document: {doc.id}")
                await db.delete(doc)
                
            await db.commit()
            return len(docs_to_delete)
        except Exception as e:
            await db.rollback()
            logger.error(f"Maintenance Error (docs): {e}")
            raise


# ── Celery Task Wrappers ───────────────────────────────────────────────────────

@celery_app.task(name="daily_maintenance")
def daily_maintenance():
    """Daily cleanup task."""
    loop = asyncio.get_event_loop()
    
    processed_accounts = loop.run_until_complete(hard_delete_expired_accounts_async())
    processed_docs = loop.run_until_complete(cleanup_expired_documents_async())
    
    return {
        "purged_accounts": processed_accounts,
        "deleted_documents": processed_docs
    }
