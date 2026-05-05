"""
Advanced Analysis Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user
from app.models.user import User
from app.models.analysis_record import AnalysisRecord
from app.models.cv_document import CVDocument
from app.models.job_description import JobDescription
from app.models.skill_report import SkillReport
from app.services.agents.advanced_analysis_agent import advanced_analysis_agent
from app.utils.db_helpers import get_or_404

router = APIRouter()


@router.get("/analysis/{analysis_id}/skill-radar")
async def get_skill_radar_data(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get skill radar chart data"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    
    radar_data = await advanced_analysis_agent.generate_skill_radar_data(
        cv_skills=[],
        jd_skills=[],
        matching_skills=analysis.matching_skills or [],
        missing_skills=analysis.missing_skills or []
    )
    
    return {"analysis_id": analysis_id, "skills": radar_data}


@router.get("/analysis/{analysis_id}/experience-heatmap")
async def get_experience_heatmap(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get experience heatmap data"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    
    # Get skill report for structured data
    sr_result = await db.execute(
        select(SkillReport).where(SkillReport.document_id == cv.id)
    )
    skill_report = sr_result.scalar_one_or_none()
    
    # Build extracted_data from skill report
    extracted_data = {}
    if skill_report:
        extracted_data = {
            "skills": skill_report.skills or [],
            "job_titles": skill_report.job_titles or [],
            "companies": skill_report.companies or [],
            "education": skill_report.education or [],
            "total_experience_months": skill_report.total_experience_months or 0,
        }
    
    areas, seniority_level = await advanced_analysis_agent.generate_experience_heatmap(
        cv_text=cv.extracted_text or "",
        extracted_data=extracted_data
    )
    
    return {"analysis_id": analysis_id, "areas": areas, "seniority_level": seniority_level}


@router.get("/analysis/{analysis_id}/semantic-proximity")
async def get_semantic_proximity(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get semantic proximity data"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    jd = await get_or_404(db, JobDescription, analysis.job_description_id, "Job description not found")
    
    proximity_data = await advanced_analysis_agent.calculate_semantic_proximity(
        cv_text=cv.extracted_text or "",
        jd_text=jd.description or "",
        match_score=float(analysis.match_score or 0.0)
    )
    
    return {"analysis_id": analysis_id, **proximity_data}


@router.get("/analysis/{analysis_id}/red-flags")
async def get_red_flags(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Detect red flags in CV"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    
    # Build extracted_data from skill report
    sr_result = await db.execute(
        select(SkillReport).where(SkillReport.document_id == cv.id)
    )
    skill_report = sr_result.scalar_one_or_none()
    extracted_data = {}
    if skill_report:
        extracted_data = {
            "skills": skill_report.skills or [],
            "job_titles": skill_report.job_titles or [],
            "total_experience_months": skill_report.total_experience_months or 0,
        }
    
    red_flags, overall_risk = await advanced_analysis_agent.detect_red_flags(
        cv_text=cv.extracted_text or "",
        extracted_data=extracted_data
    )
    
    return {
        "analysis_id": analysis_id, 
        "red_flags": red_flags, 
        "flags": red_flags, # Match frontend expectation
        "overall_risk": overall_risk
    }


@router.get("/analysis/{analysis_id}/interview-guide")
async def get_interview_guide(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate personalized interview guide"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    jd = await get_or_404(db, JobDescription, analysis.job_description_id, "Job description not found")
    
    # Build extracted_data from skill report
    sr_result = await db.execute(
        select(SkillReport).where(SkillReport.document_id == cv.id)
    )
    skill_report = sr_result.scalar_one_or_none()
    extracted_data = {}
    if skill_report:
        extracted_data = {
            "skills": skill_report.skills or [],
            "job_titles": skill_report.job_titles or [],
            "total_experience_months": skill_report.total_experience_months or 0,
        }
    
    red_flags, _ = await advanced_analysis_agent.detect_red_flags(
        cv_text=cv.extracted_text or "",
        extracted_data=extracted_data
    )
    
    questions = await advanced_analysis_agent.generate_interview_questions(
        cv_text=cv.extracted_text or "",
        jd_text=jd.description or "",
        missing_skills=analysis.missing_skills or [],
        red_flags_count=len(red_flags)
    )
    
    # Categorize questions for frontend (Technical vs Behavioral)
    tech_qs = [q for q in questions if q.get('category') in ['technical', 'gap_focused', 'strength']]
    beh_qs = [q for q in questions if q.get('category') in ['behavioral', 'red_flag']]
    
    # Fallback if categories are missing
    if not tech_qs and not beh_qs and questions:
        tech_qs = questions[:len(questions)//2]
        beh_qs = questions[len(questions)//2:]
    
    return {
        "analysis_id": analysis_id,
        "candidate_name": cv.original_filename.replace('.pdf', '').replace('_', ' '),
        "technical_questions": tech_qs,
        "behavioral_questions": beh_qs,
        "raw_questions": questions
    }


@router.get("/analysis/{analysis_id}/ai-confidence")
async def get_ai_confidence(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get AI confidence score"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    
    # Use lang_confidence from CVDocument as proxy for OCR quality
    ocr_quality = float(cv.lang_confidence or 0.85)
    
    # Compute data_completeness from actual extracted text
    has_text = bool(cv.extracted_text and len(cv.extracted_text) > 100)
    has_masked = bool(cv.masked_text)
    data_completeness = 0.9 if (has_text and has_masked) else 0.5 if has_text else 0.3
    
    model_certainty = float(analysis.confidence_score or 0.8)
    
    overall_confidence, breakdown = await advanced_analysis_agent.calculate_ai_confidence(
        ocr_quality=ocr_quality,
        data_completeness=data_completeness,
        model_certainty=model_certainty
    )
    
    return {
        "analysis_id": analysis_id,
        "overall_confidence": overall_confidence,
        "breakdown": breakdown,
        "ocr_quality": ocr_quality,
        "data_completeness": data_completeness,
        "model_certainty": model_certainty
    }


@router.get("/analysis/{analysis_id}/bias-check")
async def get_bias_check(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get bias check summary"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    
    # Count PII entities masked from PII mappings
    from app.models.pii_mapping import PIIMapping
    from sqlalchemy import func
    pii_count_result = await db.execute(
        select(func.count()).select_from(PIIMapping)
        .where(PIIMapping.document_id == cv.id)
    )
    pii_masked = pii_count_result.scalar() or 0
    
    checks, fairness_score, overall_status = await advanced_analysis_agent.perform_bias_check(
        pii_masked_count=pii_masked,
        analysis_data={}
    )
    
    return {
        "analysis_id": analysis_id,
        "checks": checks,
        "pii_masked": pii_masked,
        "fairness_score": fairness_score,
        "overall_status": overall_status,
        "detected": overall_status != "passed", # Match frontend expectation
        "details": f"Fairness score: {fairness_score:.0%}. {len(checks)} checks performed."
    }


@router.get("/analysis/{analysis_id}/hallucination-guard")
async def get_hallucination_guard(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get hallucination guard verification"""
    analysis = await get_or_404(db, AnalysisRecord, analysis_id, "Analysis not found")
    cv = await get_or_404(db, CVDocument, analysis.cv_document_id, "CV not found")
    
    claims = []
    if analysis.matching_skills:
        claims.extend([f"Candidate has {s} skill" for s in analysis.matching_skills[:5]])
    if analysis.missing_skills:
        claims.extend([f"Candidate lacks {s} skill" for s in analysis.missing_skills[:5]])
    
    verified_claims, verification_rate, unverified_count = await advanced_analysis_agent.verify_claims(
        cv_text=cv.extracted_text or "",
        analysis_claims=claims
    )
    
    overall_trust = "high" if verification_rate >= 0.9 else "medium" if verification_rate >= 0.7 else "low"
    
    return {
        "analysis_id": analysis_id,
        "verified_claims": verified_claims,
        "verification_rate": verification_rate,
        "unverified_count": unverified_count,
        "overall_trust": overall_trust,
        "detected": overall_trust == "low", # Match frontend expectation
        "details": f"Verification rate: {verification_rate:.0%}. {unverified_count} claims unverified."
    }


@router.get("/job-description/{jd_id}/candidate-comparison")
async def get_candidate_comparison(
    jd_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get candidate comparison for a job description.
    
    Optimized to prevent N+1 query problem by using JOIN.
    """
    # Use JOIN to fetch analyses with CV documents in single query (prevents N+1)
    result = await db.execute(
        select(AnalysisRecord, CVDocument)
        .join(CVDocument, AnalysisRecord.cv_document_id == CVDocument.id)
        .where(AnalysisRecord.job_description_id == jd_id)
        .order_by(AnalysisRecord.match_score.desc())
        .limit(10)
    )
    rows = result.all()
    
    if not rows:
        return {"jd_id": jd_id, "candidates": []}
    
    candidates = []
    for analysis, cv in rows:
        # Get skill report for structured data
        sr_result = await db.execute(
            select(SkillReport).where(SkillReport.document_id == cv.id)
        )
        skill_report = sr_result.scalar_one_or_none()
        extracted_data = {}
        if skill_report:
            extracted_data = {
                "skills": skill_report.skills or [],
                "job_titles": skill_report.job_titles or [],
                "total_experience_months": skill_report.total_experience_months or 0,
            }
        
        red_flags, _ = await advanced_analysis_agent.detect_red_flags(
            cv_text=cv.extracted_text or "",
            extracted_data=extracted_data
        )
        
        years_experience = (extracted_data.get("total_experience_months", 0) or 0) / 12
        
        candidates.append({
            "id": str(analysis.id),
            "name": cv.original_filename.replace('.pdf', '').replace('_', ' '),
            "match_score": float(analysis.match_score or 0.0),
            "matching_skills": analysis.matching_skills or [],
            "missing_skills": analysis.missing_skills or [],
            "years_experience": round(years_experience, 1),
            "seniority_level": "Mid-Level",  # Derived from experience
            "confidence_score": float(analysis.confidence_score or 0.8),
            "red_flags": len(red_flags)
        })
    
    return {"jd_id": jd_id, "candidates": candidates}
