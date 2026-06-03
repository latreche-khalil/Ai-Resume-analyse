"""
CV Document endpoints.

Requirements: 3.1, 3.2, 3.11
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status, UploadFile, File, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user
from app.models.user import User
from app.models.cv_document import CVDocument
from app.models.skill_report import SkillReport
from app.models.pii_mapping import PIIMapping
from app.services.extraction.document_ingestion import document_ingestion_service
from app.services.privacy.privacy_gateway import privacy_gateway
from app.schemas.document import (
    CVDocumentResponse,
    CVDocumentListResponse,
    SkillReportResponse
)
from app.utils.logger import logger


router = APIRouter(prefix="/documents")


@router.post(
    "/upload",
    response_model=CVDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload CV document",
    description="Upload a CV file for processing"
)
async def upload_cv(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CVDocumentResponse:
    """
    Upload CV document and process in background.
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # 1. Initial upload (Validation, Virus Scan, Storage) - FAST
        cv_document, error_msg = await document_ingestion_service.upload_cv(
            file_content=file_content,
            filename=file.filename,
            user_id=current_user.id,
            db=db
        )
        
        if not cv_document:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg or "Failed to upload document"
            )
        
        # Extract client info for audit trail
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # 2. Add HEAVY processing to background tasks
        background_tasks.add_task(
            run_heavy_processing,
            document_id=cv_document.id,
            user_email=current_user.email,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        logger.info(f"CV upload accepted: {cv_document.id}. Processing started in background.")

        from app.core.simple_cache import simple_cache
        simple_cache.delete_prefix(f"docs:{current_user.id}:")

        return CVDocumentResponse.model_validate(cv_document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )

async def run_heavy_processing(
    document_id: UUID,
    user_email: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
):
    """
    Background task for OCR, PII masking, and Skill Extraction.
    Ensures status is updated even on failure.
    """
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        cv_document = None
        try:
            logger.info(f"Background processing started for {document_id}")
            
            # 1. Fetch document
            res = await db.execute(select(CVDocument).where(CVDocument.id == document_id))
            cv_document = res.scalar_one_or_none()
            if not cv_document:
                logger.error(f"Document {document_id} not found in background task")
                return

            # 2. Document Processing (OCR + PII)
            success, error = await document_ingestion_service.process_document(
                document_id,
                db,
                ip_address=ip_address,
                user_agent=user_agent
            )
            if not success:
                logger.error(f"Stage 1 (Ingestion) failed for {document_id}: {error}")
                cv_document.processing_status = 'failed'
                cv_document.status_message = f"Processing error: {error}"
                await db.commit()
                return

            # Refresh after Stage 1
            await db.refresh(cv_document)

            # 3. Skill Extraction (LLM Agent)
            if cv_document.masked_text:
                from app.services.agents.extraction_agent import extraction_agent
                
                cv_document.processing_status = 'processing'
                cv_document.status_message = "Extracting professional skills with AI..."
                await db.commit()
                
                try:
                    # Run extraction with a safety wrapper
                    extracted_data = await extraction_agent.extract_structured_data(
                        masked_text=cv_document.masked_text,
                        language=cv_document.detected_language or 'en',
                        db=db
                    )
                    
                    await extraction_agent.store_extraction_results(
                        document_id=str(cv_document.id),
                        extracted_data=extracted_data,
                        db=db
                    )
                except Exception as llm_e:
                    logger.warning(f"Skill extraction failed for {document_id}, but text was extracted: {llm_e}")
                    # We don't fail the whole process if only LLM enrichment fails
                
                # FINAL completion
                cv_document.processing_status = 'completed'
                cv_document.status_message = "Ingestion complete. Skills indexed."
                await db.commit()
                logger.info(f"Background processing completed for {document_id}")
                
        except Exception as e:
            logger.error(f"Fatal error in background task for {document_id}: {e}", exc_info=True)
            if cv_document:
                try:
                    cv_document.processing_status = 'failed'
                    cv_document.status_message = "A system error occurred during processing."
                    await db.commit()
                except:
                    pass


@router.get(
    "/{document_id}",
    response_model=CVDocumentResponse,
    summary="Get CV document",
    description="Retrieve CV document details"
)
async def get_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CVDocumentResponse:
    """
    Get CV document by ID.
    
    Requirements: 3.11
    """
    from app.utils.db_helpers import get_user_cv_or_403
    
    # Use helper to eliminate repetitive ownership verification
    document = await get_user_cv_or_403(db, document_id, current_user.id)
    
    # Fetch latest analysis info
    from app.models.analysis_record import AnalysisRecord
    analysis_res = await db.execute(
        select(AnalysisRecord.id, AnalysisRecord.match_score)
        .where(AnalysisRecord.cv_document_id == document_id)
        .order_by(AnalysisRecord.created_at.desc())
        .limit(1)
    )
    latest = analysis_res.first()
    
    doc_resp = CVDocumentResponse.model_validate(document)
    if latest:
        doc_resp.latest_analysis_id = latest[0]
        doc_resp.match_score = float(latest[1]) if latest[1] is not None else None
    
    return doc_resp


@router.get(
    "",
    response_model=CVDocumentListResponse,
    summary="List CV documents",
    description="Get paginated list of user's CV documents"
)
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by processing status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CVDocumentListResponse:
    """List user's CV documents with pagination. Requirements: 3.11"""
    from app.core.simple_cache import simple_cache

    cache_key = f"docs:{current_user.id}:{skip}:{limit}:{status_filter}"
    cached = simple_cache.get(cache_key)
    if cached is not None:
        return cached
    # Build query
    query = select(CVDocument).where(
        CVDocument.user_id == current_user.id,
        CVDocument.deleted_at.is_(None)
    )
    
    # Apply status filter
    if status_filter:
        query = query.where(CVDocument.processing_status == status_filter)
    
    # Get total count
    count_query = select(func.count()).select_from(CVDocument).where(
        CVDocument.user_id == current_user.id,
        CVDocument.deleted_at.is_(None)
    )
    if status_filter:
        count_query = count_query.where(CVDocument.processing_status == status_filter)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Get documents with latest analysis info in one go
    from app.models.analysis_record import AnalysisRecord
    from sqlalchemy import outerjoin, and_
    
    # Subquery to get the latest analysis ID for each document
    latest_analysis_sub = (
        select(
            AnalysisRecord.cv_document_id,
            func.max(AnalysisRecord.created_at).label("latest_created_at")
        )
        .group_by(AnalysisRecord.cv_document_id)
        .subquery()
    )

    # Main query joining CVDocument with AnalysisRecord via the subquery
    query = (
        select(CVDocument, AnalysisRecord.id, AnalysisRecord.match_score)
        .outerjoin(
            latest_analysis_sub,
            CVDocument.id == latest_analysis_sub.c.cv_document_id
        )
        .outerjoin(
            AnalysisRecord,
            and_(
                AnalysisRecord.cv_document_id == CVDocument.id,
                AnalysisRecord.created_at == latest_analysis_sub.c.latest_created_at
            )
        )
        .where(
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    
    if status_filter:
        query = query.where(CVDocument.processing_status == status_filter)
        
    query = query.order_by(CVDocument.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    rows = result.all()
    
    docs_with_analysis = []
    for doc, analysis_id, match_score in rows:
        doc_resp = CVDocumentResponse.model_validate(doc)
        doc_resp.latest_analysis_id = analysis_id
        doc_resp.match_score = float(match_score) if match_score is not None else None
        docs_with_analysis.append(doc_resp)

    result_obj = CVDocumentListResponse(
        documents=docs_with_analysis,
        total=total,
        skip=skip,
        limit=limit
    )
    # Cache for 10 seconds to absorb burst requests from multiple components
    simple_cache.set(cache_key, result_obj, ttl=10)
    return result_obj


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete CV document",
    description="Soft delete CV document"
)
async def delete_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete CV document (soft delete).
    
    Requirements: 3.11
    """
    result = await db.execute(
        select(CVDocument).where(
            CVDocument.id == document_id,
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    document = result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Soft delete
    document.deleted_at = datetime.now(timezone.utc)
    
    await db.commit()

    from app.core.simple_cache import simple_cache
    simple_cache.delete_prefix(f"docs:{current_user.id}:")
    logger.info(f"Document deleted: {document_id} by user {current_user.email}")


@router.get(
    "/{document_id}/skill-report",
    response_model=SkillReportResponse,
    summary="Get skill report",
    description="Retrieve extracted skills from CV"
)
async def get_skill_report(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SkillReportResponse:
    """
    Get skill report for CV document.
    
    Requirements: 3.11
    """
    # Verify document ownership
    doc_result = await db.execute(
        select(CVDocument).where(
            CVDocument.id == document_id,
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Get skill report
    report_result = await db.execute(
        select(SkillReport).where(SkillReport.document_id == document_id)
    )
    skill_report = report_result.scalar_one_or_none()
    
    if not skill_report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Skill report not found. Document may not be processed yet."
        )
    
    return SkillReportResponse.model_validate(skill_report)


@router.get(
    "/{document_id}/unmask",
    summary="Unmask PII",
    description="Unmask PII for authorized user ONLY"
)
async def unmask_document(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Unmask PII for authorized user ONLY.
    
    Returns original text with PII restored.
    
    Requirements: Privacy Gateway Stage 3
    """
    try:
        # Verify ownership
        doc_result = await db.execute(
            select(CVDocument).where(
                CVDocument.id == document_id,
                CVDocument.user_id == current_user.id,
                CVDocument.deleted_at.is_(None)
            )
        )
        document = doc_result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )
        
        if not document.masked_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no masked text"
            )
        
        # Get PII mappings
        mappings_result = await db.execute(
            select(PIIMapping).where(PIIMapping.document_id == document_id)
        )
        pii_mappings = mappings_result.scalars().all()
        
        if not pii_mappings:
            # No PII to unmask, return masked text as is
            return {
                'document_id': str(document_id),
                'original_text': document.masked_text,
                'masked_text': document.masked_text,
                'pii_count': 0
            }
        
        # Unmask PII
        unmasked_text = await privacy_gateway.unmask_pii_for_owner(
            masked_text=document.masked_text,
            pii_mappings=list(pii_mappings),
            user_id=current_user.id,
            db=db
        )
        
        logger.info(f"PII unmasked for document {document_id} by user {current_user.email}")
        
        return {
            'document_id': str(document_id),
            'original_text': unmasked_text,
            'masked_text': document.masked_text,
            'pii_count': len(pii_mappings)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unmask error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unmask document"
        )


# ── CV Preview ─────────────────────────────────────────────────────────────────

@router.get(
    "/{document_id}/preview",
    summary="Get CV preview",
    description="Get CV file preview metadata or content"
)
async def get_cv_preview(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get CV file preview. 
    If the client expects JSON (frontend components), we provide a summary.
    If the client expects a file, we provide the FileResponse.
    """
    from fastapi.responses import FileResponse, JSONResponse
    import os
    
    # Verify ownership
    doc_result = await db.execute(
        select(CVDocument).where(
            CVDocument.id == document_id,
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Check if frontend component is asking for image list (as seen in DocumentsView.tsx)
    # We can detect this by checking for an Accept header or just providing a fallback
    # For now, let's look at the implementation in DocumentsView.tsx which expects:
    # { images: [{ image: "base64_or_url" }] }
    
    # If it's a PDF, we might want to return the first page as an image
    # But to keep it simple and fix the "heavy" feel, let's check if we can return a thumbnail
    
    # Check if file exists
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # If it's already an image, we can return it as a base64 for the frontend "preview"
    file_ext = document.original_filename.lower().split('.')[-1] if document.original_filename else 'pdf'
    
    # If the frontend is likely calling this (via apiClient.getCVPreview)
    # it expects a JSON with image URLs/data
    
    # For now, let's provide a JSON response that the frontend can handle
    # to avoid the FileResponse -> response.json() error which causes "heaviness" due to failed promises
    
    preview_url = f"/api/v1/documents/{document_id}/preview-image?page=1"
    
    return {
        "document_id": str(document_id),
        "filename": document.original_filename,
        "images": [
            {"image": preview_url, "page": 1}
        ]
    }


@router.get("/{document_id}/preview/image/{page}")
async def get_cv_preview_image_path(
    document_id: UUID,
    page: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alias for path-based page access."""
    return await _get_cv_preview_image_logic(document_id, page, current_user, db)


@router.get(
    "/{document_id}/preview-image",
    summary="Get CV preview as image",
    description="Convert CV to image for preview (works with PDF, DOCX)"
)
async def get_cv_preview_image_query(
    document_id: UUID,
    page: int = Query(1, ge=1, description="Page number to convert"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Alias for query-based page access."""
    return await _get_cv_preview_image_logic(document_id, page, current_user, db)


async def _get_cv_preview_image_logic(
    document_id: UUID,
    page: int,
    current_user: User,
    db: AsyncSession
):
    """
    Shared logic to convert CV document to image for preview.
    """
    from fastapi.responses import Response
    import os
    import io
    
    # Verify ownership
    doc_result = await db.execute(
        select(CVDocument).where(
            CVDocument.id == document_id,
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    document = doc_result.scalar_one_or_none()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    if not document.file_path or not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV file not found on disk"
        )
    
    file_ext = document.original_filename.lower().split('.')[-1] if document.original_filename else 'pdf'
    
    try:
        if file_ext == 'pdf':
            # Try to convert PDF to image
            try:
                from pdf2image import convert_from_path
                
                # Convert PDF page to image
                images = convert_from_path(
                    document.file_path, 
                    first_page=page, 
                    last_page=page,
                    dpi=150,  # Good quality for preview
                    fmt='PNG'
                )
                
                if images:
                    # Convert PIL image to bytes
                    img_buffer = io.BytesIO()
                    images[0].save(img_buffer, format='PNG', optimize=True)
                    img_buffer.seek(0)
                    
                    logger.info(f"Successfully converted PDF page {page} to image for document {document_id}")
                    
                    return Response(
                        content=img_buffer.getvalue(),
                        media_type="image/png",
                        headers={
                            "Cache-Control": "max-age=3600",
                            "X-Document-ID": str(document_id),
                            "X-Page-Number": str(page)
                        }
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Could not convert page {page} of PDF"
                    )
                    
            except ImportError:
                logger.warning("pdf2image not available, falling back to original file")
                raise HTTPException(
                    status_code=status.HTTP_501_NOT_IMPLEMENTED,
                    detail="PDF to image conversion not available. Install pdf2image and poppler-utils."
                )
                
        elif file_ext in ['jpg', 'jpeg', 'png']:
            # Already an image, return as-is
            with open(document.file_path, 'rb') as f:
                content = f.read()
            
            media_type = f"image/{file_ext}" if file_ext != 'jpg' else 'image/jpeg'
            return Response(
                content=content,
                media_type=media_type,
                headers={
                    "Cache-Control": "max-age=3600",
                    "X-Document-ID": str(document_id)
                }
            )
        
        # For unsupported formats, return error
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Cannot convert {file_ext} files to image preview. Supported formats: PDF, JPG, PNG"
        )
        
    except Exception as e:
        logger.error(f"Error converting document {document_id} to image: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to convert document to image: {str(e)}"
        )


# ── Candidate Export ───────────────────────────────────────────────────────────

@router.get(
    "/{document_id}/export",
    summary="Export analysis report",
    description="Export candidate's analysis report as PDF or CSV"
)
async def export_analysis_report(
    document_id: UUID,
    format: str = Query("pdf", pattern="^(pdf|csv)$"),
    analysis_id: Optional[UUID] = Query(None, description="Specific analysis to export (latest if omitted)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export the candidate's analysis report (PDF or CSV).

    - **pdf**: Full report with match score, skills, gaps, roadmap, XAI
    - **csv**: Tabular data — skills, gaps, roadmap items

    The export always uses the candidate's real name (PII re-identified locally).
    """
    from app.models.analysis_record import AnalysisRecord
    from app.models.gap_report import GapReport
    from app.models.xai_report import XAIReport
    from app.models.skill_report import SkillReport
    from fastapi.responses import StreamingResponse, Response
    import io, csv, json as _json
    from datetime import datetime, timezone

    # ── Verify ownership ───────────────────────────────────────────────────
    doc_result = await db.execute(
        select(CVDocument).where(
            CVDocument.id == document_id,
            CVDocument.user_id == current_user.id,
            CVDocument.deleted_at.is_(None)
        )
    )
    document = doc_result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    # ── Get analysis (latest or specific) ─────────────────────────────────
    if analysis_id:
        ar = await db.execute(
            select(AnalysisRecord).where(
                AnalysisRecord.id == analysis_id,
                AnalysisRecord.cv_document_id == document_id,
            )
        )
    else:
        ar = await db.execute(
            select(AnalysisRecord)
            .where(
                AnalysisRecord.cv_document_id == document_id,
                AnalysisRecord.processing_status == "completed",
            )
            .order_by(AnalysisRecord.created_at.desc())
            .limit(1)
        )
    analysis = ar.scalar_one_or_none()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No completed analysis found for this document")

    # ── Fetch related reports ──────────────────────────────────────────────
    gap_r = (await db.execute(select(GapReport).where(GapReport.analysis_record_id == analysis.id))).scalar_one_or_none()
    xai_r = (await db.execute(select(XAIReport).where(XAIReport.analysis_record_id == analysis.id))).scalar_one_or_none()
    skill_r = (await db.execute(select(SkillReport).where(SkillReport.document_id == document_id))).scalar_one_or_none()

    score_pct = f"{float(analysis.match_score) * 100:.0f}%" if analysis.match_score else "N/A"
    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # ══════════════════════════════════════════════════════════════════════
    # CSV export
    # ══════════════════════════════════════════════════════════════════════
    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)

        # Header block
        writer.writerow(["AI Resume Analyzer — Candidate Report"])
        writer.writerow(["Generated", generated_at])
        writer.writerow(["File", document.original_filename])
        writer.writerow(["Match Score", score_pct])
        writer.writerow([])

        # Skills
        writer.writerow(["=== SKILLS ==="])
        writer.writerow(["Name", "Level (%)", "Category", "Market Demand (%)"])
        for s in (skill_r.skills if skill_r and skill_r.skills else []):
            writer.writerow([s.get("name",""), s.get("level",""), s.get("category",""), s.get("demand","")])
        writer.writerow([])

        # Matching / Missing
        writer.writerow(["=== MATCHING SKILLS ==="])
        for sk in (analysis.matching_skills or []):
            writer.writerow([sk])
        writer.writerow([])
        writer.writerow(["=== MISSING SKILLS ==="])
        for sk in (analysis.missing_skills or []):
            writer.writerow([sk])
        writer.writerow([])

        # Gaps
        if gap_r:
            writer.writerow(["=== CRITICAL GAPS ==="])
            writer.writerow(["Skill", "Reason", "Impact if Fixed", "Difficulty", "Time to Proficiency"])
            for g in (gap_r.critical_gaps or []):
                writer.writerow([g.get("skill",""), g.get("reason",""), g.get("impact_if_fixed",""), g.get("learning_difficulty",""), g.get("time_to_proficiency","")])
            writer.writerow([])

            writer.writerow(["=== LEARNING ROADMAP ==="])
            writer.writerow(["Skill", "Personalized Note", "Estimated Weeks", "ROI"])
            for item in (gap_r.learning_roadmap or []):
                writer.writerow([item.get("skill",""), item.get("personalized_note",""), item.get("estimated_weeks",""), item.get("roi","")])
            writer.writerow([])

            writer.writerow(["=== QUICK WINS ==="])
            writer.writerow(["Action", "Impact", "Effort", "Timeline"])
            for qw in (gap_r.quick_wins or []):
                writer.writerow([qw.get("action",""), qw.get("impact",""), qw.get("effort",""), qw.get("timeline","")])

        content = output.getvalue().encode("utf-8-sig")   # BOM for Excel
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="analysis_{analysis.id}.csv"'},
        )

    # ══════════════════════════════════════════════════════════════════════
    # PDF export  (plain HTML → PDF via weasyprint if available, else HTML)
    # ══════════════════════════════════════════════════════════════════════
    matching = analysis.matching_skills or []
    missing  = analysis.missing_skills  or []
    transferable = analysis.transferable_skills or []

    gaps_html = ""
    roadmap_html = ""
    quick_wins_html = ""
    xai_html = ""
    differentiator_html = ""

    if gap_r:
        # Critical gaps
        rows = "".join(
            f"<tr><td>{g.get('skill','')}</td><td>{g.get('reason','')}</td>"
            f"<td>{g.get('impact_if_fixed','')}</td><td>{g.get('time_to_proficiency','')}</td></tr>"
            for g in (gap_r.critical_gaps or [])
        )
        if rows:
            gaps_html = f"""
            <h2>Critical Gaps</h2>
            <table><thead><tr><th>Skill</th><th>Why Critical</th><th>Impact if Fixed</th><th>Time</th></tr></thead>
            <tbody>{rows}</tbody></table>"""

        # Roadmap
        roadmap_rows = "".join(
            f"<tr><td><strong>{r.get('skill','')}</strong><br><em>{r.get('personalized_note','')}</em></td>"
            f"<td>{r.get('estimated_weeks','')} weeks</td><td>{r.get('roi','')}</td></tr>"
            for r in (gap_r.learning_roadmap or [])
        )
        if roadmap_rows:
            roadmap_html = f"""
            <h2>Learning Roadmap</h2>
            <table><thead><tr><th>Skill & Note</th><th>Duration</th><th>ROI</th></tr></thead>
            <tbody>{roadmap_rows}</tbody></table>"""

        # Quick wins
        qw_items = "".join(
            f"<li><strong>{qw.get('action','')}</strong> — {qw.get('impact','')} "
            f"<span class='badge'>{qw.get('effort','')} effort · {qw.get('timeline','')}</span></li>"
            for qw in (gap_r.quick_wins or [])
        )
        if qw_items:
            quick_wins_html = f"<h2>Quick Wins</h2><ul>{qw_items}</ul>"

        # Differentiator
        diff = gap_r.competitive_differentiator or {}
        if diff.get("strength"):
            differentiator_html = f"""
            <h2>Your Competitive Advantage</h2>
            <div class='highlight'>
              <p><strong>{diff.get('strength','')}</strong></p>
              <p>{diff.get('how_to_leverage','')}</p>
              <p><em>{diff.get('market_value','')}</em></p>
            </div>"""

    if xai_r:
        pos = "".join(f"<li>{c.get('claim','')}: {c.get('impact','')}</li>" for c in (xai_r.evidence_for_match or [])[:4])
        neg = "".join(f"<li>{c.get('gap','')}: {c.get('impact','')}</li>" for c in (xai_r.evidence_against_match or [])[:4])
        xai_html = f"""
        <h2>Why This Score? (AI Explanation)</h2>
        <div style='display:flex;gap:2rem'>
          <div style='flex:1'><h3 style='color:#16a34a'>What Helped ✓</h3><ul>{pos}</ul></div>
          <div style='flex:1'><h3 style='color:#dc2626'>What Lowered Score ✗</h3><ul>{neg}</ul></div>
        </div>"""

    skills_list = "".join(
        f"<span class='skill-tag'>{s}</span>"
        for s in ((skill_r.skills or []) if skill_r else [])[:20]
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Analysis Report</title>
<style>
  body {{ font-family: Arial, sans-serif; margin: 40px; color: #1f2937; font-size: 14px; }}
  h1   {{ color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; }}
  h2   {{ color: #374151; margin-top: 28px; border-left: 4px solid #3b82f6; padding-left: 10px; }}
  h3   {{ color: #6b7280; }}
  table {{ width:100%; border-collapse:collapse; margin-top:10px; }}
  th    {{ background:#1d4ed8; color:#fff; padding:8px; text-align:left; }}
  td    {{ padding:7px 8px; border-bottom:1px solid #e5e7eb; }}
  tr:nth-child(even) td {{ background:#f9fafb; }}
  .score-box {{ display:inline-block; background:#1d4ed8; color:#fff; font-size:2.5rem;
                font-weight:bold; padding:16px 32px; border-radius:12px; margin:12px 0; }}
  .skill-tag {{ display:inline-block; background:#dbeafe; color:#1e40af; border-radius:20px;
                padding:3px 10px; margin:3px; font-size:12px; }}
  .badge     {{ background:#f3f4f6; border-radius:10px; padding:2px 8px; font-size:11px; }}
  .highlight {{ background:#fefce8; border-left:4px solid #eab308; padding:14px; border-radius:6px; }}
  .meta      {{ color:#6b7280; font-size:12px; margin-bottom:20px; }}
  ul         {{ padding-left:20px; line-height:1.8; }}
  .two-col   {{ display:flex; gap:2rem; }}
  .two-col > div {{ flex:1; }}
</style>
</head>
<body>

<h1>AI Resume Analysis Report</h1>
<p class="meta">Generated: {generated_at} &nbsp;|&nbsp; File: {document.original_filename}</p>

<h2>Match Score</h2>
<div class="score-box">{score_pct}</div>
<p>This score reflects how well your CV matches the job requirements based on semantic analysis.</p>

<div class="two-col">
  <div>
    <h2>Matching Skills</h2>
    <ul>{"".join(f"<li>{s}</li>" for s in matching[:15])}</ul>
  </div>
  <div>
    <h2>Missing Skills</h2>
    <ul>{"".join(f"<li>{s}</li>" for s in missing[:15])}</ul>
  </div>
</div>

{"<h2>Transferable Skills</h2><ul>" + "".join(f"<li>{s}</li>" for s in transferable[:8]) + "</ul>" if transferable else ""}

<h2>Your Skills</h2>
<div>{skills_list}</div>

{gaps_html}
{roadmap_html}
{quick_wins_html}
{differentiator_html}
{xai_html}

<hr style="margin-top:40px">
<p style="color:#9ca3af;font-size:11px">
  ⚠ This report is advisory only (is_binding = false).
  The final hiring decision rests with the recruiter.
  Generated by AI Resume Analyzer.
</p>
</body>
</html>"""

    # Try xhtml2pdf for real PDF (Windows-compatible), fall back to HTML download
    try:
        from io import BytesIO
        from xhtml2pdf import pisa  # type: ignore[import-untyped]

        pdf_buffer = BytesIO()
        pisa_status = pisa.CreatePDF(html, dest=pdf_buffer)
        if pisa_status.err:
            raise RuntimeError(f"PDF generation error: {pisa_status.err}")
        pdf_bytes = pdf_buffer.getvalue()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="analysis_{analysis.id}.pdf"'},
        )
    except (ImportError, RuntimeError) as pdf_err:
        logger.warning(f"PDF generation failed ({pdf_err}), falling back to HTML")
        # Fall back to HTML — browser can use File > Print > Save as PDF
        return Response(
            content=html.encode("utf-8"),
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="analysis_{analysis.id}.html"'},
        )
