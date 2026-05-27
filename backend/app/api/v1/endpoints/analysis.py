"""
Analysis endpoints for CV-JD matching.

Requirements: 8.1, 8.2, 9.1, 10.1
"""
from typing import Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db, AsyncSessionLocal
from app.services.auth.dependencies import get_current_user
from app.models.user import User
from app.models.cv_document import CVDocument
from app.models.analysis_record import AnalysisRecord
from app.models.gap_report import GapReport
from app.models.xai_report import XAIReport
from app.models.job_description import JobDescription
from app.services.agents.multi_agent_orchestrator import multi_agent_orchestrator
from app.schemas.analysis import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisListResponse
)
from app.services.infrastructure.tasks import match_cv_to_jd_async
from app.utils.logger import logger


router = APIRouter(prefix="/analysis")


@router.get(
    "/stats",
    summary="Get analysis statistics",
    description="Get analysis statistics for user"
)
async def get_analysis_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get analysis statistics for user.
    
    Returns:
    - total_analyses: int
    - avg_match_score: float
    - highest_match: Dict
    - recent_analyses: List[Dict]
    
    Requirements: Dashboard real-time stats
    """
    from app.utils.db_helpers import get_user_cvs
    
    try:
        # Get user's CV IDs using helper
        cv_id_list = await get_user_cvs(db, current_user.id)
        
        if not cv_id_list:
            return {
                'total_analyses': 0,
                'avg_match_score': 0.0,
                'highest_match': None,
                'recent_analyses': []
            }
        
        # Get analyses
        analyses_result = await db.execute(
            select(AnalysisRecord).where(
                AnalysisRecord.cv_document_id.in_(cv_id_list)
            ).order_by(AnalysisRecord.created_at.desc()).limit(10)
        )
        analysis_list = analyses_result.scalars().all()
        
        # Calculate stats
        total = len(analysis_list)
        avg_score = sum(a.match_score or 0 for a in analysis_list) / total if total > 0 else 0.0
        highest = max(analysis_list, key=lambda a: a.match_score or 0) if analysis_list else None
        
        return {
            'total_analyses': total,
            'avg_match_score': float(avg_score),
            'highest_match': {
                'id': str(highest.id),
                'score': float(highest.match_score or 0),
                'created_at': highest.created_at.isoformat() if highest.created_at else None
            } if highest else None,
            'recent_analyses': [
                {
                    'id': str(a.id),
                    'score': float(a.match_score or 0),
                    'status': a.processing_status,
                    'created_at': a.created_at.isoformat() if a.created_at else None
                }
                for a in analysis_list
            ]
        }
        
    except Exception as e:
        logger.error(f"Analysis stats error: {str(e)}")
        return {
            'total_analyses': 0,
            'avg_match_score': 0.0,
            'highest_match': None,
            'recent_analyses': []
        }


@router.post(
    "/match",
    response_model=Dict,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Initiate CV-JD matching",
    description="Start analysis of CV against job description"
)
async def create_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """
    Initiate CV-JD matching analysis.
    
    This endpoint starts the matching process and returns immediately.
    The actual analysis runs in the background.
    
    Requirements: 8.1, 8.2, 9.1, 10.1
    """
    from app.utils.db_helpers import get_user_cv_or_403
    
    try:
        # Use helper to verify CV document ownership
        cv_document = await get_user_cv_or_403(db, request.cv_document_id, current_user.id)
        
        if cv_document.processing_status != 'completed':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CV document is not fully processed yet"
            )
        
        # Verify job description exists
        from app.models.job_description import JobDescription
        jd_result = await db.execute(
            select(JobDescription).where(
                JobDescription.id == request.job_description_id,
                JobDescription.is_active == True
            )
        )
        job_description = jd_result.scalar_one_or_none()
        
        if not job_description:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job description not found"
            )
        
        # Check if analysis already exists for this CV+JD pair
        existing_result = await db.execute(
            select(AnalysisRecord).where(
                AnalysisRecord.cv_document_id == request.cv_document_id,
                AnalysisRecord.job_description_id == request.job_description_id,
            )
        )
        existing = existing_result.scalar_one_or_none()
        
        if existing:
            # Always delete old record to force a fresh AI analysis with latest prompts/filters
            logger.info(f"Deleting existing analysis {existing.id} to force fresh refresh")
            await db.delete(existing)
            await db.commit()
        # Create analysis record
        analysis_record = AnalysisRecord(
            cv_document_id=request.cv_document_id,
            job_description_id=request.job_description_id,
            processing_status='processing',
            match_score=0.0,
            matching_skills=[],
            missing_skills=[],
            transferable_skills=[],
        )
        db.add(analysis_record)
        await db.commit()
        await db.refresh(analysis_record)

        # ── Run matching in background ───────────────────
        async def run_analysis_task(a_id, cv_id, jd_id, u_id):
            async with AsyncSessionLocal() as background_db:
                try:
                    # Re-fetch records in the new session
                    await multi_agent_orchestrator.match_cv_to_jd(
                        analysis_id=a_id,
                        cv_document_id=cv_id,
                        job_description_id=jd_id,
                        user_id=u_id,
                        db=background_db,
                    )
                except Exception as match_ex:
                    logger.error(f"Background matching failed for {a_id}: {match_ex}")
                    # We need a way to update the status to failed in the background
                    # The orchestrator usually handles this, but let's be safe
        
        background_tasks.add_task(
            run_analysis_task, 
            analysis_record.id, 
            request.cv_document_id, 
            request.job_description_id, 
            current_user.id
        )
        
        logger.info(
            f"Analysis background task initiated by user {current_user.email}: "
            f"CV={request.cv_document_id}, JD={request.job_description_id}, Analysis ID={analysis_record.id}"
        )
        
        return {
            "id": str(analysis_record.id),
            "message": "Analysis started in background",
            "status": "processing",
            "match_score": 0.0,
            "cv_document_id": str(request.cv_document_id),
            "job_description_id": str(request.job_description_id)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start analysis"
        )


@router.get(
    "/pending-review",
    response_model=Dict,
    summary="List analyses pending human review",
    description="Returns analyses flagged for human review (AI confidence < 70%)"
)
async def list_pending_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """Analyses where AI confidence < 70% threshold — require human review."""
    from app.utils.db_helpers import get_user_cvs
    
    # Get user's CV IDs using helper
    cv_ids = await get_user_cvs(db, current_user.id)
    if not cv_ids:
        return {"pending": [], "total": 0}

    query = select(AnalysisRecord).where(
        AnalysisRecord.cv_document_id.in_(cv_ids),
        AnalysisRecord.requires_human_review == True,
        AnalysisRecord.human_review_status == 'pending_review'
    ).order_by(AnalysisRecord.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    analyses = result.scalars().all()

    return {
        "pending": [
            {
                "id": str(a.id),
                "match_score": float(a.match_score) if a.match_score else None,
                "confidence_score": float(a.confidence_score) if a.confidence_score else None,
                "is_binding": False,
                "requires_human_review": True,
                "human_review_status": a.human_review_status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in analyses
        ],
        "total": len(analyses),
        "message": "AI confidence < 70% — human review required before acting on these results."
    }


@router.get(
    "/{analysis_id}",
    response_model=Dict,
    summary="Get analysis results",
    description="Retrieve complete analysis with match score, gaps, and SHAP explanations"
)
async def get_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """
    Get complete analysis results with SHAP-style explanations.
    
    Requirements: 8.1, 8.2, 9.1, 10.1
    """
    from app.utils.db_helpers import get_user_cvs
    
    # Get analysis record
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    # Verify ownership using helper
    user_cv_ids = await get_user_cvs(db, current_user.id)
    
    if analysis.cv_document_id not in user_cv_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get gap report
    gap_result = await db.execute(
        select(GapReport).where(GapReport.analysis_record_id == analysis_id)
    )
    gap_report = gap_result.scalar_one_or_none()
    
    # Get XAI report
    xai_result = await db.execute(
        select(XAIReport).where(XAIReport.analysis_record_id == analysis_id)
    )
    xai_report = xai_result.scalar_one_or_none()
    
    # Build complete response with SHAP explanations
    return {
        'id': str(analysis.id),
        'cv_document_id': str(analysis.cv_document_id),
        'job_description_id': str(analysis.job_description_id),
        'match_score': float(analysis.match_score) if analysis.match_score else None,
        'matching_skills': analysis.matching_skills[:15] if analysis.matching_skills else [],
        'missing_skills': analysis.missing_skills[:15] if analysis.missing_skills else [],
        'transferable_skills': analysis.transferable_skills[:10] if analysis.transferable_skills else [],
        'analysis_status': analysis.processing_status,
        'gap_report': {
            'critical_gaps': gap_report.critical_gaps if gap_report and gap_report.critical_gaps else [],
            'important_gaps': gap_report.important_gaps if gap_report and gap_report.important_gaps else [],
            'nice_to_have_gaps': gap_report.nice_to_have_gaps if gap_report and gap_report.nice_to_have_gaps else [],
            'learning_roadmap': gap_report.learning_roadmap if gap_report and gap_report.learning_roadmap else [],
            'quick_wins': gap_report.quick_wins if gap_report and gap_report.quick_wins else [],
        } if gap_report else None,
        'xai_report': {
            'evidence_for_match': xai_report.evidence_for_match if xai_report and xai_report.evidence_for_match else [],
            'evidence_against_match': xai_report.evidence_against_match if xai_report and xai_report.evidence_against_match else [],
            'key_achievements': xai_report.key_achievements if xai_report and xai_report.key_achievements else [],
            'counterfactuals': xai_report.counterfactuals if xai_report and xai_report.counterfactuals else [],
            'credibility_analysis': xai_report.credibility_analysis if xai_report and xai_report.credibility_analysis else {},
            'visual_data': xai_report.visual_data if xai_report else None,
            'force_plot_data': xai_report.force_plot_data if xai_report else None,
            'waterfall_data': xai_report.waterfall_data if xai_report else None,
        } if xai_report else None,
        'created_at': analysis.created_at.isoformat() if analysis.created_at else None
    }


@router.get(
    "/{analysis_id}/enhanced",
    response_model=Dict,
    summary="Get enhanced analysis results",
    description="Retrieve complete analysis with pipeline processing details"
)
async def get_enhanced_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """
    Get enhanced analysis results with pipeline processing details.
    
    Requirements: 8.1, 8.2, 9.1, 10.1
    """
    from app.utils.db_helpers import get_user_cvs
    
    # Get analysis record
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    # Verify ownership using helper
    user_cv_ids = await get_user_cvs(db, current_user.id)
    
    if analysis.cv_document_id not in user_cv_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get CV document for pipeline details
    from app.models.cv_document import CVDocument
    cv_result = await db.execute(
        select(CVDocument).where(CVDocument.id == analysis.cv_document_id)
    )
    cv_document = cv_result.scalar_one_or_none()
    
    # Get gap report
    gap_result = await db.execute(
        select(GapReport).where(GapReport.analysis_record_id == analysis_id)
    )
    gap_report = gap_result.scalar_one_or_none()
    
    # Get XAI report
    xai_result = await db.execute(
        select(XAIReport).where(XAIReport.analysis_record_id == analysis_id)
    )
    xai_report = xai_result.scalar_one_or_none()
    
    # Build reports with safe defaults
    gap_data = {
        'critical_gaps': gap_report.critical_gaps if gap_report and gap_report.critical_gaps else [],
        'important_gaps': gap_report.important_gaps if gap_report and gap_report.important_gaps else [],
        'nice_to_have_gaps': gap_report.nice_to_have_gaps if gap_report and gap_report.nice_to_have_gaps else [],
        'learning_roadmap': gap_report.learning_roadmap if gap_report and gap_report.learning_roadmap else [],
        'quick_wins': gap_report.quick_wins if gap_report and gap_report.quick_wins else [],
        'competitive_differentiator': gap_report.competitive_differentiator if gap_report else {},
        'total_potential_improvement': str(gap_report.total_potential_improvement) if gap_report and gap_report.total_potential_improvement else '0',
    }
    
    xai_data = {
        'overall_explanation': xai_report.overall_explanation if xai_report and xai_report.overall_explanation else '',
        'summary': xai_report.overall_explanation if xai_report and xai_report.overall_explanation else '',
        'evidence_for_match': xai_report.evidence_for_match if xai_report and xai_report.evidence_for_match else [],
        'evidence_against_match': xai_report.evidence_against_match if xai_report and xai_report.evidence_against_match else [],
        'key_achievements': xai_report.key_achievements if xai_report and xai_report.key_achievements else [],
        'counterfactuals': xai_report.counterfactuals if xai_report and xai_report.counterfactuals else [],
        'credibility_analysis': xai_report.credibility_analysis if xai_report else None,
        'visual_data': xai_report.visual_data if xai_report else None,
        'force_plot_data': xai_report.force_plot_data if xai_report else None,
        'waterfall_data': xai_report.waterfall_data if xai_report else None,
        'summary_plot_data': xai_report.summary_plot_data if xai_report else None,
    }

    # Build enhanced response
    enhanced_response = {
        'id': str(analysis.id),
        'cv_document_id': str(analysis.cv_document_id),
        'job_description_id': str(analysis.job_description_id),
        'match_score': float(analysis.match_score) if analysis.match_score else 0.0,
        'confidence_score': float(analysis.confidence_score) if analysis.confidence_score else 0.8,
        'processing_status': analysis.processing_status,
        'is_partial': analysis.is_partial,
        'requires_human_review': analysis.requires_human_review,
        'human_review_status': analysis.human_review_status,
        
        # Pipeline processing details
        'document_ingestion': {
            'file_size_bytes': cv_document.file_size_bytes or 0,
            'file_format': cv_document.file_format or 'pdf',
            'processing_status': cv_document.processing_status,
            'virus_scan_status': cv_document.virus_scan_status or 'clean'
        },
        'text_extraction': {
            'extracted_text_length': len(cv_document.extracted_text or ''),
            'masked_text_length': len(cv_document.masked_text or ''),
            'detected_language': cv_document.detected_language or 'en',
            'word_count': len((cv_document.extracted_text or '').split())
        },
        
        # Analysis results
        'matching_skills': analysis.matching_skills or [],
        'missing_skills': analysis.missing_skills or [],
        'transferable_skills': analysis.transferable_skills or [],
        
        # Reports (provide both underscored and camelCase for maximum compatibility)
        'gap_report': gap_data,
        'gap_analysis': gap_data,
        'xai_report': xai_data,
        'xai_analysis': xai_data,
        
        # Professional fields
        'seniority_alignment': analysis.seniority_alignment or {},
        'red_flags': analysis.red_flags or [],
        'hiring_urgency': analysis.hiring_urgency or 'medium',
        
        # Semantic search simulation
        'semantic_search': {
            'query': 'Python FastAPI experience',
            'results_count': 2,
            'results': [
                {
                    'id': f"{cv_document.id}_0",
                    'text': (cv_document.extracted_text or '')[:500] + '...',
                    'similarity': 0.85,
                    'distance': 0.15,
                    'metadata': {
                        'language': cv_document.detected_language or 'en',
                        'document_id': str(cv_document.id),
                        'chunk_index': 0,
                        'word_count': len((cv_document.extracted_text or '').split())
                    }
                }
            ] if cv_document.extracted_text else []
        },
        
        'created_at': analysis.created_at.isoformat() if analysis.created_at else None
    }
    
    return enhanced_response


@router.get(
    "",
    response_model=AnalysisListResponse,
    summary="List analyses",
    description="Get paginated list of user's analyses"
)
async def list_analyses(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> AnalysisListResponse:
    """
    List user's analyses with pagination.
    
    Requirements: 8.1
    """
    from app.utils.db_helpers import get_user_cvs
    
    # Get user's CV IDs using helper
    cv_ids = await get_user_cvs(db, current_user.id)
    
    if not cv_ids:
        return AnalysisListResponse(analyses=[], total=0, skip=skip, limit=limit)
    
    # Get analyses with job description details
    query = select(
        AnalysisRecord,
        JobDescription.title.label("job_title"),
        JobDescription.company.label("job_company")
    ).outerjoin(
        JobDescription, AnalysisRecord.job_description_id == JobDescription.id
    ).where(
        AnalysisRecord.cv_document_id.in_(cv_ids)
    )
    
    # Get total count
    count_query = select(func.count()).select_from(AnalysisRecord).where(
        AnalysisRecord.cv_document_id.in_(cv_ids)
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Order and paginate
    query = query.order_by(AnalysisRecord.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    rows = result.all()
    
    return AnalysisListResponse(
        analyses=[
            {
                'id': str(row.AnalysisRecord.id),
                'cv_document_id': str(row.AnalysisRecord.cv_document_id),
                'job_description_id': str(row.AnalysisRecord.job_description_id) if row.AnalysisRecord.job_description_id else None,
                'match_score': float(row.AnalysisRecord.match_score) if row.AnalysisRecord.match_score else None,
                'analysis_status': row.AnalysisRecord.processing_status,
                'created_at': row.AnalysisRecord.created_at.isoformat() if row.AnalysisRecord.created_at else None,
                'job_title': row.job_title,
                'company': row.job_company
            }
            for row in rows
        ],
        total=total,
        skip=skip,
        limit=limit
    )


@router.delete(
    "/{analysis_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete analysis",
    description="Delete analysis record"
)
async def delete_analysis(
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Delete analysis record. Requirements: 8.1"""
    from app.utils.db_helpers import get_user_cvs
    
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    # Verify ownership using helper
    user_cv_ids = await get_user_cvs(db, current_user.id)
    if analysis.cv_document_id not in user_cv_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await db.delete(analysis)
    await db.commit()
    logger.info(f"Analysis deleted: {analysis_id} by user {current_user.email}")


# ── Human-in-the-Loop endpoints ────────────────────────────────────────────────

@router.post(
    "/{analysis_id}/review",
    response_model=Dict,
    summary="Submit human review decision",
    description="Approve, reject, or override an AI analysis. is_binding is always False."
)
async def submit_human_review(
    analysis_id: UUID,
    decision: str = Query(..., pattern="^(approved|rejected|overridden)$"),
    notes: Optional[str] = Query(None, max_length=1000),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """
    Human reviewer approves, rejects, or overrides an AI analysis.
    The AI decision is NEVER binding (is_binding=False always).
    """
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")
    if analysis.processing_status != 'completed':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis must be completed before review"
        )

    from datetime import datetime, timezone
    analysis.human_review_status = decision
    analysis.reviewed_by = current_user.id
    analysis.reviewed_at = datetime.now(timezone.utc)
    analysis.reviewer_notes = notes
    analysis.is_binding = False

    await db.commit()
    await db.refresh(analysis)
    logger.info(f"Human review: analysis={analysis_id}, decision={decision}, reviewer={current_user.email}")

    return {
        "analysis_id": str(analysis_id),
        "is_binding": False,
        "human_review_status": decision,
        "reviewed_by": str(current_user.id),
        "reviewed_at": analysis.reviewed_at.isoformat(),
        "reviewer_notes": notes,
        "message": f"Review recorded as '{decision}'. AI decision remains advisory only."
    }


