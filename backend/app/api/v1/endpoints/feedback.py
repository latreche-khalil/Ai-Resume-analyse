"""
Feedback endpoints.

Requirements: 18.1-18.10
"""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.feedback import Feedback
from app.utils.logger import logger


router = APIRouter(prefix="/feedback")


@router.post("", status_code=status.HTTP_201_CREATED)
async def submit_feedback(
    analysis_id: UUID,
    accuracy_rating: int,
    feedback_text: str = None,
    is_dispute: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit feedback on analysis accuracy.
    If is_dispute=True, routes to DLQ for human review.
    Requirements: 18.1, 18.2
    """
    if not (1 <= accuracy_rating <= 5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )

    feedback = Feedback(
        user_id=current_user.id,
        analysis_record_id=analysis_id,
        rating=accuracy_rating,
        feedback_text=feedback_text,
        feedback_type='accuracy'
    )
    db.add(feedback)

    # Activity Diagram 6: Feedback is a dispute? → Create dispute ticket → Send to human review
    if is_dispute:
        from app.models.dlq_record import DLQRecord
        dispute = DLQRecord(
            user_id=current_user.id,
            job_type="feedback_dispute",
            failure_type="user_dispute",
            failure_reason=feedback_text or "User disputed analysis result",
            payload={
                "analysis_id": str(analysis_id),
                "rating": accuracy_rating,
                "feedback": feedback_text
            },
            status="pending"
        )
        db.add(dispute)
        await db.commit()
        logger.info(f"Dispute ticket created by {current_user.email} for analysis {analysis_id}")
        return {
            "message": "Dispute submitted. A human reviewer will examine your case.",
            "is_dispute": True,
            "status": "pending_review"
        }

    await db.commit()
    logger.info(f"Feedback submitted by {current_user.email} for analysis {analysis_id}")
    return {"message": "Feedback submitted successfully", "is_dispute": False}


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
            func.avg(Feedback.accuracy_rating).label('avg_rating'),
            func.count(Feedback.id).label('total_feedback')
        )
    )
    stats = result.first()
    
    return {
        "average_rating": float(stats.avg_rating) if stats.avg_rating else 0,
        "total_feedback": stats.total_feedback
    }
