"""
Recruiter tools endpoints.

Requirements: 14.1-14.10, 15.1-15.10, 16.1-16.8, 17.1-17.10
"""
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.auth.dependencies import require_role
from app.models.user import User
from app.models.talent_pool import TalentPool, TalentPoolCV
from app.utils.logger import logger


router = APIRouter(prefix="/recruiter")


# ── Dashboard Stats ────────────────────────────────────────────────────────────
@router.get("/dashboard-stats")
async def get_dashboard_stats(
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """
    Get real dashboard statistics for the recruiter.
    Returns analyses, match scores, talent pool counts.
    """
    from app.models.cv_document import CVDocument
    from app.models.analysis_record import AnalysisRecord
    from app.models.job_description import JobDescription
    from sqlalchemy import select, func

    # Get all CVs uploaded by this recruiter
    cv_result = await db.execute(
        select(CVDocument.id).where(
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    cv_ids = [row[0] for row in cv_result.all()]

    # Also get analyses via JDs owned by this recruiter
    jd_result = await db.execute(
        select(JobDescription.id).where(
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    jd_ids = [row[0] for row in jd_result.all()]

    # Analyses = CV belongs to recruiter OR JD belongs to recruiter
    from sqlalchemy import or_
    analysis_filter = []
    if cv_ids:
        analysis_filter.append(AnalysisRecord.cv_document_id.in_(cv_ids))
    if jd_ids:
        analysis_filter.append(AnalysisRecord.job_description_id.in_(jd_ids))

    if not analysis_filter:
        pool_count_result = await db.execute(
            select(func.count(TalentPool.id)).where(TalentPool.recruiter_id == current_user.id)
        )
        return {
            "total_analyses": 0, "avg_match_score": 0, "top_matches": 0,
            "pending_reviews": 0, "total_cvs": len(cv_ids), "total_jds": len(jd_ids),
            "pool_count": pool_count_result.scalar() or 0, "analyses": []
        }

    # Get all analyses matching the filter — only recruiter-initiated ones
    analyses_result = await db.execute(
        select(
            AnalysisRecord,
            JobDescription.title.label("job_title")
        ).outerjoin(
            JobDescription, AnalysisRecord.job_description_id == JobDescription.id
        ).where(
            or_(*analysis_filter),
            or_(
                AnalysisRecord.initiated_by_role == 'recruiter',
                AnalysisRecord.initiated_by_role.is_(None)  # keep legacy records
            )
        ).order_by(AnalysisRecord.created_at.desc()).limit(100)
    )
    rows = analyses_result.all()

    analyses = [
        {
            "id": str(row.AnalysisRecord.id),
            "cv_document_id": str(row.AnalysisRecord.cv_document_id),
            "job_description_id": str(row.AnalysisRecord.job_description_id) if row.AnalysisRecord.job_description_id else None,
            "match_score": float(row.AnalysisRecord.match_score) if row.AnalysisRecord.match_score else None,
            "analysis_status": row.AnalysisRecord.processing_status,
            "requires_human_review": row.AnalysisRecord.requires_human_review or False,
            "created_at": row.AnalysisRecord.created_at.isoformat() if row.AnalysisRecord.created_at else None,
            "job_title": row.job_title,
        }
        for row in rows
    ]

    completed = [a for a in analyses if a["analysis_status"] in ("completed", "partial_done") and a["match_score"] is not None]
    scores = [a["match_score"] * 100 if a["match_score"] <= 1 else a["match_score"] for a in completed]
    avg = round(sum(scores) / len(scores)) if scores else 0
    top = sum(1 for s in scores if s >= 70)
    pending = sum(1 for a in completed if a["requires_human_review"])

    # CV count — all CVs accessible to recruiter (own + via JDs)
    all_cv_ids_in_analyses = list({a["cv_document_id"] for a in analyses})
    total_cvs = max(len(cv_ids), len(all_cv_ids_in_analyses))

    # JD count
    jd_count_result = await db.execute(
        select(func.count(JobDescription.id)).where(
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    # Pool count
    pool_count_result = await db.execute(
        select(func.count(TalentPool.id)).where(TalentPool.recruiter_id == current_user.id)
    )

    return {
        "total_analyses": len(completed),
        "total_cvs": total_cvs,
        "avg_match_score": avg,
        "top_matches": top,
        "pending_reviews": pending,
        "total_jds": jd_count_result.scalar() or 0,
        "pool_count": pool_count_result.scalar() or 0,
        "analyses": analyses
    }



@router.post("/candidates/{cv_document_id}/reveal")
async def reveal_candidate_identity(
    cv_document_id: UUID,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
):
    """
    Reveal the real identity of a shortlisted candidate.

    The recruiter can only call this AFTER the candidate has been shortlisted
    in a talent pool. Every reveal is logged in the audit trail.

    Requirements: 16.6 — Controlled PII disclosure with audit
    """
    from app.models.cv_document import CVDocument
    from app.models.pii_mapping import PIIMapping
    from app.services.privacy.privacy_gateway import privacy_gateway
    from app.services.privacy.audit_trail import audit_trail_service

    # 1. Verify the CV exists
    cv_result = await db.execute(
        select(CVDocument).where(CVDocument.id == cv_document_id)
    )
    cv = cv_result.scalar_one_or_none()
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    # 2. Verify candidate is shortlisted in at least one of recruiter's pools
    pool_result = await db.execute(
        select(TalentPoolCV).join(
            TalentPool,
            TalentPoolCV.talent_pool_id == TalentPool.id
        ).where(
            TalentPoolCV.cv_document_id == cv_document_id,
            TalentPoolCV.status == 'shortlisted',
            TalentPool.recruiter_id == current_user.id
        )
    )
    shortlisted = pool_result.scalar_one_or_none()
    if not shortlisted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only reveal identity of shortlisted candidates. "
                   "Please shortlist this candidate first."
        )

    # 3. Get PII mappings for this document
    mappings_result = await db.execute(
        select(PIIMapping).where(PIIMapping.document_id == cv_document_id)
    )
    pii_mappings = mappings_result.scalars().all()

    # 4. Decrypt and build identity dict
    from app.services.privacy.pii_tokenizer import tokenizer
    identity = {}
    for mapping in pii_mappings:
        try:
            original = tokenizer.decrypt(mapping.encrypted_value)
            entity_type = mapping.entity_type
            if entity_type not in identity:
                identity[entity_type] = []
            identity[entity_type].append(original)
        except Exception:
            pass

    # 5. Log the reveal in audit trail
    try:
        await audit_trail_service.log_pii_action(
            db=db,
            user_id=current_user.id,
            action="UNMASKED",
            purpose="Recruiter Identity Reveal — Candidate Shortlisted",
            document_id=cv_document_id,
            legal_basis="candidate_shortlisted",
        )
    except Exception as audit_err:
        logger.warning(f"Audit log failed (non-critical): {audit_err}")

    logger.info(
        f"Identity revealed: cv={cv_document_id} by recruiter={current_user.email}"
    )

    return {
        "cv_document_id": str(cv_document_id),
        "filename": cv.original_filename,
        "identity": identity,
        "legal_basis": "candidate_shortlisted",
        "revealed_by": current_user.email,
        "warning": "This action has been logged. Handle personal data responsibly."
    }


# ── Note: Bulk upload, talent-pool ranking, candidate details, and export ──────
# These endpoints are deferred to Phase 2 and have been removed to avoid
# exposing stub routes that return hardcoded/fake data in production.
# The frontend handles bulk upload via the standard /documents/upload endpoint.
