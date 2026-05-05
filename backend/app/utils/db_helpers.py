"""
Database Helper Functions
Eliminates repetitive database operations
"""
from typing import TypeVar, Optional, Type
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

T = TypeVar('T')


async def get_or_404(
    db: AsyncSession,
    model: Type[T],
    id: any,
    error_message: str = "Resource not found"
) -> T:
    """
    Get a record by ID or raise 404.
    
    Usage:
        user = await get_or_404(db, User, user_id, "User not found")
    """
    result = await db.execute(select(model).where(model.id == id))
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=error_message
        )
    
    return record


async def get_user_cv_or_403(
    db: AsyncSession,
    cv_id: UUID,
    user_id: UUID,
    for_update: bool = False
) -> 'CVDocument':
    """
    Get CV document owned by user or raise 403.
    Eliminates repetitive ownership verification pattern.
    
    Usage:
        cv = await get_user_cv_or_403(db, cv_id, current_user.id)
        cv = await get_user_cv_or_403(db, cv_id, current_user.id, for_update=True)
    """
    from app.models.cv_document import CVDocument
    
    query = select(CVDocument).where(
        CVDocument.id == cv_id,
        CVDocument.user_id == user_id,
        CVDocument.deleted_at.is_(None)
    )
    
    if for_update:
        query = query.with_for_update(skip_locked=True)
    
    result = await db.execute(query)
    cv_document = result.scalar_one_or_none()
    
    if not cv_document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV document not found"
        )
    
    if cv_document.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return cv_document


async def get_user_cvs(
    db: AsyncSession,
    user_id: UUID,
    only_completed: bool = False
) -> list:
    """
    Get all CV IDs for a user.
    Eliminates repetitive CV listing pattern.
    
    Usage:
        cv_ids = await get_user_cvs(db, current_user.id)
        cv_ids = await get_user_cvs(db, current_user.id, only_completed=True)
    """
    from app.models.cv_document import CVDocument
    
    query = select(CVDocument.id).where(
        CVDocument.user_id == user_id,
        CVDocument.deleted_at.is_(None)
    )
    
    if only_completed:
        query = query.where(CVDocument.processing_status == 'completed')
    
    result = await db.execute(query)
    return [row[0] for row in result.all()]


async def safe_commit(db: AsyncSession) -> bool:
    """
    Safely commit with automatic rollback on error.
    
    Usage:
        db.add(new_record)
        await safe_commit(db)
    
    Returns:
        True if successful, False if failed
    """
    try:
        await db.commit()
        return True
    except Exception as e:
        await db.rollback()
        raise e


async def create_and_refresh(db: AsyncSession, record: T) -> T:
    """
    Add, commit, and refresh a record.
    
    Usage:
        user = User(email="test@example.com")
        user = await create_and_refresh(db, user)
    """
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


async def update_and_refresh(db: AsyncSession, record: T) -> T:
    """
    Commit changes and refresh a record.
    
    Usage:
        user.email = "new@example.com"
        user = await update_and_refresh(db, user)
    """
    await db.commit()
    await db.refresh(record)
    return record


async def delete_record(db: AsyncSession, record: T) -> None:
    """
    Delete a record and commit.
    
    Usage:
        await delete_record(db, user)
    """
    await db.delete(record)
    await db.commit()
