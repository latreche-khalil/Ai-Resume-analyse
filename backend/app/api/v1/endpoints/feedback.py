"""
Feedback endpoints.

Requirements: 18.1-18.10
"""
from uuid import UUID
from typing import Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.feedback import Feedback
from app.utils.logger import logger


router = APIRouter(prefix="/feedback")


class FeedbackCreate(BaseModel):
    """Schema for creating feedback"""
    analysis_id: Optional[UUID] = Field(None, description="Analysis ID (optional for general feedback)")
    accuracy_rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    feedback_text: Optional[str] = Field(None, description="Detailed feedback text")
    is_dispute: bool = Field(False, description="Whether this is a dispute")


class FeedbackUpdate(BaseModel):
    """Schema for updating feedback"""
    accuracy_rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1 to 5")
    feedback_text: Optional[str] = Field(None, description="Detailed feedback text")


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit feedback on analysis accuracy or general platform feedback.
    If is_dispute=True, routes to DLQ for human review.
    Requirements: 18.1, 18.2
    
    For general feedback (not related to specific analysis), analysis_id can be None.
    """
    feedback = Feedback(
        user_id=current_user.id,
        analysis_record_id=feedback_data.analysis_id,
        rating=feedback_data.accuracy_rating,
        feedback_text=feedback_data.feedback_text,
        feedback_type='accuracy' if feedback_data.analysis_id else 'general'
    )
    db.add(feedback)

    if feedback_data.is_dispute and feedback_data.analysis_id:
        from app.models.dlq_record import DLQRecord
        dispute = DLQRecord(
            user_id=current_user.id,
            job_type="feedback_dispute",
            failure_type="user_dispute",
            failure_reason=feedback_data.feedback_text or "User disputed analysis result",
            payload={
                "analysis_id": str(feedback_data.analysis_id),
                "rating": feedback_data.accuracy_rating,
                "feedback": feedback_data.feedback_text
            },
            status="pending"
        )
        db.add(dispute)
        await db.commit()
        await db.refresh(feedback)
        logger.info(f"Dispute ticket created by {current_user.email} for analysis {feedback_data.analysis_id}")
        return {
            "id": str(feedback.id),
            "message": "Dispute submitted. A human reviewer will examine your case.",
            "is_dispute": True,
            "status": "pending_review"
        }

    await db.commit()
    await db.refresh(feedback)
    logger.info(f"Feedback submitted by {current_user.email}" + (f" for analysis {feedback_data.analysis_id}" if feedback_data.analysis_id else " (general)"))
    return {
        "id": str(feedback.id),
        "message": "Feedback submitted successfully",
        "is_dispute": False
    }


@router.get("/stats")
async def get_feedback_stats(
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Get aggregate feedback statistics (admin only).
    Requirements: 18.9
    """
    result = await db.execute(
        select(
            func.avg(Feedback.rating).label('avg_rating'),
            func.count(Feedback.id).label('total_feedback')
        )
    )
    stats = result.first()
    
    return {
        "average_rating": float(stats.avg_rating) if stats.avg_rating else 0,
        "total_feedback": stats.total_feedback
    }


@router.get("/all")
async def get_all_feedback(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """Get all feedback (admin only)."""
    result = await db.execute(
        select(Feedback, User.email, User.first_name, User.last_name)
        .join(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    rows = result.all()
    return [
        {
            "id": str(f.id),
            "user_email": email,
            "user_name": f"{first_name or ''} {last_name or ''}".strip() or email,
            "rating": f.rating,
            "feedback_text": f.feedback_text,
            "feedback_type": f.feedback_type,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f, email, first_name, last_name in rows
    ]
@router.get("/my")
async def get_my_feedback(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get feedback submitted by the current user."""
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == current_user.id)
        .order_by(Feedback.created_at.desc())
        .limit(20)
    )
    feedbacks = result.scalars().all()
    return [
        {
            "id": str(f.id),
            "rating": f.rating,
            "feedback_text": f.feedback_text,
            "feedback_type": f.feedback_type,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in feedbacks
    ]


@router.patch("/{feedback_id}")
async def update_feedback(
    feedback_id: UUID,
    feedback_data: FeedbackUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update own feedback within 15 days of submission.
    """
    from datetime import datetime, timezone
    result = await db.execute(
        select(Feedback).where(Feedback.id == feedback_id)
    )
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    # Check ownership
    if feedback.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this feedback record")
        
    # Check 15-day limit
    now = datetime.now(timezone.utc)
    created_at = feedback.created_at
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
        
    if (now - created_at).days >= 15:
        raise HTTPException(
            status_code=400,
            detail="You cannot edit your feedback after 15 days from submission"
        )
        
    # Update fields
    if feedback_data.accuracy_rating is not None:
        feedback.rating = feedback_data.accuracy_rating
    if feedback_data.feedback_text is not None:
        feedback.feedback_text = feedback_data.feedback_text
        
    await db.commit()
    await db.refresh(feedback)
    
    return {
        "id": str(feedback.id),
        "message": "Feedback updated successfully",
        "rating": feedback.rating,
        "feedback_text": feedback.feedback_text
    }
