"""
Talent Pool Management Endpoints.

Requirements: Activity Diagram 3, Class Diagram 2
"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.services.auth.dependencies import require_role
from app.models.user import User
from app.models.talent_pool import TalentPool, TalentPoolCV
from app.models.cv_document import CVDocument
from app.schemas.talent_pool import (
    TalentPoolCreate, TalentPoolRead, TalentPoolDetail, TalentPoolUpdate,
    BatchRankRequest, BatchRankResponse
)
from app.utils.logger import logger
from app.services.recruiter.batch_ranking import batch_ranking_service

router = APIRouter(prefix="/talent-pools", tags=["Recruiter Tools"])


@router.post("/", response_model=TalentPoolRead, status_code=status.HTTP_201_CREATED)
async def create_talent_pool(
    pool_in: TalentPoolCreate,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """Create a new talent pool for a recruitment project."""
    pool = TalentPool(
        **pool_in.model_dump(),
        recruiter_id=current_user.id
    )
    db.add(pool)
    await db.commit()
    await db.refresh(pool)
    return pool


@router.get("/", response_model=List[TalentPoolRead])
async def list_talent_pools(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """List all talent pools managed by the recruiter."""
    from sqlalchemy import func as sqlfunc

    query = select(TalentPool).where(
        TalentPool.recruiter_id == current_user.id
    ).offset(skip).limit(limit)

    result = await db.execute(query)
    pools = result.scalars().all()

    # Attach candidates_count to each pool
    pool_ids = [p.id for p in pools]
    if pool_ids:
        counts_result = await db.execute(
            select(TalentPoolCV.talent_pool_id, sqlfunc.count(TalentPoolCV.cv_document_id).label("cnt"))
            .where(TalentPoolCV.talent_pool_id.in_(pool_ids))
            .group_by(TalentPoolCV.talent_pool_id)
        )
        counts = {row[0]: row[1] for row in counts_result.all()}
        for pool in pools:
            pool.candidates_count = counts.get(pool.id, 0)  # type: ignore

    return pools


@router.get("/{pool_id}", response_model=TalentPoolDetail)
async def get_talent_pool(
    pool_id: UUID,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """Get detailed information about a talent pool."""
    query = select(TalentPool).where(
        TalentPool.id == pool_id,
        TalentPool.recruiter_id == current_user.id
    )
    
    result = await db.execute(query)
    pool = result.scalar_one_or_none()
    
    if not pool:
        raise HTTPException(status_code=404, detail="Talent pool not found")
    
    # Calculate candidates count
    count_query = select(func.count(TalentPoolCV.cv_document_id)).where(
        TalentPoolCV.talent_pool_id == pool_id
    )
    count_result = await db.execute(count_query)
    count = count_result.scalar_one()

    # Fetch candidates list (TalentPoolCV associations, NOT CVDocument objects)
    candidates_result = await db.execute(
        select(TalentPoolCV).where(TalentPoolCV.talent_pool_id == pool_id)
    )
    pool_cvs = candidates_result.scalars().all()

    pool.candidates_count = count
    # Attach as a non-mapped attribute for schema serialization
    pool.__dict__['candidates'] = pool_cvs
    return pool


@router.post("/{pool_id}/candidates/{cv_id}")
async def add_candidate_to_pool(
    pool_id: UUID,
    cv_id: UUID,
    score: Optional[float] = None,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """Add a CV document to a talent pool."""
    # Verify pool ownership
    pool_query = select(TalentPool).where(
        TalentPool.id == pool_id,
        TalentPool.recruiter_id == current_user.id
    )
    pool_result = await db.execute(pool_query)
    if not pool_result.scalar_one_or_none():
         raise HTTPException(status_code=404, detail="Talent pool not found")
    
    # Check if already exists with pessimistic lock to prevent race condition
    existing = await db.execute(
        select(TalentPoolCV).where(
            TalentPoolCV.talent_pool_id == pool_id,
            TalentPoolCV.cv_document_id == cv_id
        ).with_for_update(skip_locked=True)
    )
    if existing.scalar_one_or_none():
        return {"status": "already_present"}
    
    # Add association
    assoc = TalentPoolCV(
        talent_pool_id=pool_id,
        cv_document_id=cv_id,
        pool_specific_score=score
    )
    db.add(assoc)
    await db.commit()
    
    return {"status": "success", "added_cv_id": str(cv_id)}


@router.delete("/{pool_id}/candidates/{cv_id}")
async def remove_candidate_from_pool(
    pool_id: UUID,
    cv_id: UUID,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """Remove a CV from a talent pool."""
    stmt = delete(TalentPoolCV).where(
        TalentPoolCV.talent_pool_id == pool_id,
        TalentPoolCV.cv_document_id == cv_id
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}


@router.patch("/{pool_id}/candidates/{cv_id}/status")
async def update_candidate_status(
    pool_id: UUID,
    cv_id: UUID,
    candidate_status: str = Query(..., pattern="^(shortlisted|rejected|backup|pending)$"),
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """
    Shortlist, reject, or mark candidate as backup.
    Activity Diagram 3: Shortlist Candidate? → Move to Shortlist / Reject / Mark as backup
    
    Uses pessimistic locking to prevent race conditions when multiple recruiters
    update the same candidate status simultaneously.
    """
    # Use pessimistic lock to prevent concurrent updates
    result = await db.execute(
        select(TalentPoolCV).where(
            TalentPoolCV.talent_pool_id == pool_id,
            TalentPoolCV.cv_document_id == cv_id
        ).with_for_update(skip_locked=True)
    )
    assoc = result.scalar_one_or_none()
    if not assoc:
        raise HTTPException(status_code=404, detail="Candidate not in this pool")

    assoc.status = candidate_status
    await db.commit()
    logger.info(f"Candidate {cv_id} status → {candidate_status} in pool {pool_id}")
    return {"status": "updated", "candidate_status": candidate_status}


@router.post("/{pool_id}/batch-rank", response_model=BatchRankResponse)
async def batch_rank_candidates(
    pool_id: UUID,
    request: BatchRankRequest,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """
    Rank all candidates in a talent pool against a job description.
    
    This endpoint performs multi-dimensional analysis:
    - Semantic similarity (ChromaDB vector search)
    - Skills matching (Matching Agent)
    - Experience level alignment
    - Cultural fit indicators
    
    Returns a ranked leaderboard with detailed scores for each candidate.
    """
    try:
        # Verify pool ownership
        pool_query = select(TalentPool).where(
            TalentPool.id == pool_id,
            TalentPool.recruiter_id == current_user.id
        )
        pool_result = await db.execute(pool_query)
        pool = pool_result.scalar_one_or_none()
        
        if not pool:
            raise HTTPException(status_code=404, detail="Talent pool not found")
        
        # Get all CV IDs in this pool
        cv_query = select(TalentPoolCV.cv_document_id).where(
            TalentPoolCV.talent_pool_id == pool_id
        )
        cv_result = await db.execute(cv_query)
        cv_ids = [row[0] for row in cv_result.all()]
        
        if not cv_ids:
            raise HTTPException(
                status_code=400,
                detail="No candidates in this talent pool"
            )
        
        logger.info(f"Starting batch ranking for pool {pool_id} with {len(cv_ids)} candidates")
        
        # Perform batch ranking
        ranking_result = await batch_ranking_service.rank_candidates(
            cv_ids=cv_ids,
            job_description_id=request.job_description_id,
            db=db,
            ranking_criteria=request.ranking_criteria
        )
        
        return ranking_result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch ranking error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch ranking failed: {str(e)}"
        )
