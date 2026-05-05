"""
CV Document endpoints.

Requirements: 3.1, 3.2, 3.11
"""
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
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
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CVDocumentResponse:
    """
    Upload CV document.
    
    Accepts: PDF, DOCX, JPG, PNG
    Max size: 10MB
    
    Requirements: 3.1, 3.2, 3.11
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Upload and process
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
        
        logger.info(f"CV uploaded by user {current_user.email}: {cv_document.id}")
        
        # Try to process document with timeout
        try:
            # Process with 300 second timeout for heavy local processing (OCR + Docling + Spacy)
            success, error = await asyncio.wait_for(
                document_ingestion_service.process_document(cv_document.id, db),
                timeout=300.0
            )
            if success:
                # Use a fresh query instead of refresh to avoid potential session issues after cancellation
                res = await db.execute(select(CVDocument).where(CVDocument.id == cv_document.id))
                cv_document = res.scalar_one()
                logger.info(f"Document processed: {cv_document.id} - status: {cv_document.processing_status}")
                
                # Trigger extraction agent to extract skills
                if cv_document.processing_status == 'completed' and cv_document.masked_text:
                    logger.info(f"Triggering extraction agent for document: {cv_document.id}")
                    from app.services.agents.extraction_agent import extraction_agent
                    
                    extracted_data = await extraction_agent.extract_structured_data(
                        masked_text=cv_document.masked_text,
                        language=cv_document.detected_language or 'en',
                        db=db
                    )
                    
                    skill_report = await extraction_agent.store_extraction_results(
                        document_id=str(cv_document.id),
                        extracted_data=extracted_data,
                        db=db
                    )
                    
                    logger.info(f"Skills extracted: {len(extracted_data.get('skills', []))} skills for document {cv_document.id}")
            else:
                logger.error(f"Document processing failed: {cv_document.id} - {error}")
                await db.refresh(cv_document)  # Refresh even on failure
        except asyncio.TimeoutError:
            logger.warning(f"Document processing timeout after 300s: {cv_document.id} - will continue in background")
            try:
                await db.refresh(cv_document)
            except:
                pass
        except Exception as proc_ex:
            logger.error(f"Sync processing exception: {proc_ex}", exc_info=True)
            try:
                await db.refresh(cv_document)
            except:
                pass
        
        # Final safe refresh before returning
        try:
            await db.refresh(cv_document)
        except:
            pass
        return CVDocumentResponse.model_validate(cv_document)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )


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
    
    # Fetch latest analysis
    from app.models.analysis_record import AnalysisRecord
    analysis_res = await db.execute(
        select(AnalysisRecord.id)
        .where(AnalysisRecord.cv_document_id == document_id)
        .order_by(AnalysisRecord.created_at.desc())
        .limit(1)
    )
    latest_id = analysis_res.scalar_one_or_none()
    
    doc_resp = CVDocumentResponse.model_validate(document)
    doc_resp.latest_analysis_id = latest_id
    
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
    """
    List user's CV documents with pagination.
    
    Requirements: 3.11
    """
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
    
    # Get documents
    query = query.order_by(CVDocument.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    documents = result.scalars().all()
    
    # Fetch latest analysis for each document to populate latest_analysis_id
    from app.models.analysis_record import AnalysisRecord
    docs_with_analysis = []
    for doc in documents:
        # Simple subquery for latest analysis
        analysis_res = await db.execute(
            select(AnalysisRecord.id)
            .where(AnalysisRecord.cv_document_id == doc.id)
            .order_by(AnalysisRecord.created_at.desc())
            .limit(1)
        )
        latest_id = analysis_res.scalar_one_or_none()
        
        # Create response object
        doc_resp = CVDocumentResponse.model_validate(doc)
        doc_resp.latest_analysis_id = latest_id
        docs_with_analysis.append(doc_resp)
    
    return CVDocumentListResponse(
        documents=docs_with_analysis,
        total=total,
        skip=skip,
        limit=limit
    )


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
    description="Get CV file preview as image or PDF"
)
async def get_cv_preview(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get CV file preview for display in analysis results.
    Returns the original file for preview purposes.
    If file is missing, returns a placeholder or error.
    """
    from fastapi.responses import FileResponse, Response
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
    
    # Check if file exists
    if not document.file_path or not os.path.exists(document.file_path):
        logger.warning(f"CV file not found on disk: {document.file_path} for document {document_id}")
        
        # Return a placeholder response or detailed error
        error_info = {
            "error": "CV file not found on disk",
            "document_id": str(document_id),
            "original_filename": document.original_filename,
            "expected_path": document.file_path,
            "processing_status": document.processing_status,
            "created_at": document.created_at.isoformat() if document.created_at else None
        }
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CV file not found on disk. File may have been moved or deleted. Original filename: {document.original_filename}"
        )
    
    # Determine media type based on file extension
    file_ext = document.original_filename.lower().split('.')[-1] if document.original_filename else 'pdf'
    media_type_map = {
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    media_type = media_type_map.get(file_ext, 'application/octet-stream')
    
    # Log successful file access
    logger.info(f"Serving CV preview for document {document_id}: {document.original_filename} ({media_type})")
    
    return FileResponse(
        path=document.file_path,
        media_type=media_type,
        filename=document.original_filename,
        headers={
            "Cache-Control": "max-age=3600",  # Cache for 1 hour
            "X-Document-ID": str(document_id),
            "X-Original-Filename": document.original_filename or "unknown"
        }
    )


@router.get(
    "/{document_id}/preview-image",
    summary="Get CV preview as image",
    description="Convert CV to image for preview (works with PDF, DOCX)"
)
async def get_cv_preview_image(
    document_id: UUID,
    page: int = Query(1, ge=1, description="Page number to convert (for multi-page documents)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Convert CV document to image for preview.
    Supports PDF and DOCX files.
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
                from PIL import Image
                
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
                # Fall back to original file if pdf2image is not available
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

    # Try weasyprint for real PDF, fall back to HTML download
    try:
        from weasyprint import HTML as WeasyprintHTML
        pdf_bytes = WeasyprintHTML(string=html).write_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="analysis_{analysis.id}.pdf"'},
        )
    except ImportError:
        # weasyprint not installed — return HTML (browser can print to PDF)
        return Response(
            content=html.encode("utf-8"),
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="analysis_{analysis.id}.html"'},
        )
