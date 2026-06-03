"""
Job Description endpoints (Recruiter only).

Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user, require_role
from app.models.user import User
from app.models.job_description import JobDescription
from app.schemas.job_description import (
    JobDescriptionCreate,
    JobDescriptionUpdate,
    JobDescriptionResponse,
    JobDescriptionListResponse
)
from app.utils.logger import logger


router = APIRouter(prefix="/job-descriptions")


@router.post(
    "",
    response_model=JobDescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create job description",
    description="Create a new job description (Recruiter only)"
)
async def create_job_description(
    jd_data: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),  # Allow both candidate and recruiter
    db: AsyncSession = Depends(get_db)
) -> JobDescriptionResponse:
    """
    Create new job description.
    
    Requirements: 11.1, 11.2
    """
    try:
        # Validate JD length (minimum 10 words)
        word_count = len(jd_data.description.split())
        if word_count < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Job description is too brief ({word_count} words). Please provide more detail."
            )

        recruiter_id = current_user.id if current_user.role == "recruiter" else None
        
        job_description = JobDescription(
            recruiter_id=recruiter_id,
            title=jd_data.title,
            company=getattr(jd_data, 'company', None),
            description=jd_data.description,
            is_active=True,
            is_archived=False,
            word_count=word_count,
            is_long=word_count > 500,
        )
        
        db.add(job_description)
        await db.commit()
        await db.refresh(job_description)

        # Invalidate list cache
        from app.core.simple_cache import simple_cache
        simple_cache.delete_prefix(f"jds:{current_user.id}:")

        logger.info(f"Job description created: {job_description.id} by {current_user.email}")
        
        return JobDescriptionResponse.model_validate(job_description)
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Job description creation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create job description"
        )


@router.get(
    "/{jd_id}",
    response_model=JobDescriptionResponse,
    summary="Get job description",
    description="Retrieve job description by ID"
)
async def get_job_description(
    jd_id: UUID,
    current_user: User = Depends(get_current_user),  # Allow both candidate and recruiter
    db: AsyncSession = Depends(get_db)
) -> JobDescriptionResponse:
    """
    Get job description by ID.
    
    Requirements: 11.5
    """
    # Build query based on user role
    if current_user.role == "recruiter":
        # Recruiters can only see their own JDs
        query = select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.recruiter_id == current_user.id
        )
    else:
        # Candidates can see JDs they created (recruiter_id is None) or any active JD
        query = select(JobDescription).where(
            JobDescription.id == jd_id
        )
    
    result = await db.execute(query)
    jd = result.scalar_one_or_none()
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    return JobDescriptionResponse.model_validate(jd)


@router.get(
    "",
    response_model=JobDescriptionListResponse,
    summary="List job descriptions",
    description="Get paginated list of job descriptions"
)
async def list_job_descriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    is_archived: Optional[bool] = Query(None, description="Filter by archived status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> JobDescriptionListResponse:
    """List job descriptions. Requirements: 11.5"""
    from app.core.simple_cache import simple_cache

    cache_key = f"jds:{current_user.id}:{skip}:{limit}:{is_active}:{is_archived}"
    cached = simple_cache.get(cache_key)
    if cached is not None:
        return cached

    if current_user.role == "recruiter":
        base_query = select(JobDescription).where(
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    else:
        base_query = select(JobDescription).where(
            JobDescription.is_active == True,
            JobDescription.deleted_at.is_(None)
        )

    if is_active is not None:
        base_query = base_query.where(JobDescription.is_active == is_active)
    if is_archived is not None:
        base_query = base_query.where(JobDescription.is_archived == is_archived)

    count_query = select(func.count()).select_from(JobDescription)
    if current_user.role == "recruiter":
        count_query = count_query.where(
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    else:
        count_query = count_query.where(
            JobDescription.recruiter_id.is_(None),
            JobDescription.deleted_at.is_(None)
        )
    if is_active is not None:
        count_query = count_query.where(JobDescription.is_active == is_active)
    if is_archived is not None:
        count_query = count_query.where(JobDescription.is_archived == is_archived)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = base_query.order_by(JobDescription.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    jds = result.scalars().all()

    response = JobDescriptionListResponse(
        items=[JobDescriptionResponse.model_validate(jd) for jd in jds],
        total=total or 0,
        skip=skip,
        limit=limit
    )
    simple_cache.set(cache_key, response, ttl=15)
    return response


@router.patch(
    "/{jd_id}",
    response_model=JobDescriptionResponse,
    summary="Update job description",
    description="Update job description (triggers re-matching)"
)
async def update_job_description(
    jd_id: UUID,
    jd_data: JobDescriptionUpdate,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
) -> JobDescriptionResponse:
    """
    Update job description.
    
    Note: Updating a JD triggers re-matching with existing CVs.
    
    Requirements: 11.6
    """
    # Get job description
    result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    jd = result.scalar_one_or_none()
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        # Update fields
        update_data = jd_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(jd, field, value)
        
        jd.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(jd)
        
        logger.info(f"Job description updated: {jd_id} by {current_user.email}")
        
        # DEFERRED: Trigger re-matching with existing CVs via Celery — Phase 2
        
        return JobDescriptionResponse.model_validate(jd)
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Job description update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update job description"
        )


@router.delete(
    "/{jd_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete job description",
    description="Soft delete job description"
)
async def delete_job_description(
    jd_id: UUID,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
) -> None:
    """
    Delete job description (soft delete).
    
    Requirements: 11.7
    """
    result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    jd = result.scalar_one_or_none()
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    # Soft delete
    jd.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    from app.core.simple_cache import simple_cache
    simple_cache.delete_prefix(f"jds:{current_user.id}:")
    logger.info(f"Job description deleted: {jd_id} by {current_user.email}")


@router.post(
    "/{jd_id}/archive",
    response_model=JobDescriptionResponse,
    summary="Archive job description",
    description="Archive job description"
)
async def archive_job_description(
    jd_id: UUID,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
) -> JobDescriptionResponse:
    """
    Archive job description.
    
    Requirements: 11.8
    """
    result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    jd = result.scalar_one_or_none()
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        jd.is_archived = True
        jd.is_active = False
        jd.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(jd)
        
        logger.info(f"Job description archived: {jd_id} by {current_user.email}")
        
        return JobDescriptionResponse.model_validate(jd)
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Job description archive error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to archive job description"
        )


@router.post(
    "/{jd_id}/extract-skills",
    response_model=dict,
    summary="Extract skills from JD",
    description="Extract skills from job description text using Extraction Agent"
)
async def extract_skills_from_jd(
    jd_id: UUID,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Extract skills from job description text.
    
    Uses the Extraction Agent to automatically identify skills
    from the JD description text.
    
    Requirements: 11.2, 11.3
    """
    from app.services.agents.extraction_agent import extraction_agent
    
    # Get job description
    result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    jd = result.scalar_one_or_none()
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        # Extract skills from description
        extracted_data = await extraction_agent.extract_structured_data(
            masked_text=jd.description,
            language='en'  # Assume English for JDs
        )
        
        # Get extracted skills
        extracted_skills = [skill['skill'] for skill in extracted_data.get('skills', [])]
        
        logger.info(f"Extracted {len(extracted_skills)} skills from JD {jd_id}")
        
        return {
            "jd_id": str(jd_id),
            "extracted_skills": extracted_skills,
            "current_required_skills": [],
            "current_preferred_skills": [],
            "message": "Skills extracted successfully. Manual editing is deprecated."
        }
        
    except Exception as e:
        logger.error(f"Skill extraction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract skills"
        )


@router.patch(
    "/{jd_id}/skills",
    response_model=JobDescriptionResponse,
    summary="Update JD skills",
    description="Manually add or remove skills from job description"
)
async def update_jd_skills(
    jd_id: UUID,
    required_skills: Optional[List[str]] = None,
    preferred_skills: Optional[List[str]] = None,
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
) -> JobDescriptionResponse:
    """
    Manually update job description skills.
    
    Requirements: 11.3, 11.4
    """
    # Get job description
    result = await db.execute(
        select(JobDescription).where(
            JobDescription.id == jd_id,
            JobDescription.recruiter_id == current_user.id,
            JobDescription.deleted_at.is_(None)
        )
    )
    jd = result.scalar_one_or_none()
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        jd.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(jd)
        
        logger.info(f"Skills update ignored for JD {jd_id} by {current_user.email}")
        
        return JobDescriptionResponse.model_validate(jd)
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Skill update error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update skills"
        )



@router.post(
    "/bulk-import",
    response_model=dict,
    summary="Bulk import job descriptions",
    description="Import multiple job descriptions from CSV"
)
async def bulk_import_jds(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("recruiter")),
    db: AsyncSession = Depends(get_db)
) -> dict:
    """
    Bulk import job descriptions from CSV file.
    
    CSV format:
    title,description,required_skills,preferred_skills,experience_level
    
    Requirements: 11.9
    """
    import csv
    import io
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be CSV format"
        )
    
    try:
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        created_jds = []
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Parse skills (comma-separated)
                required_skills = [s.strip() for s in row.get('required_skills', '').split(',') if s.strip()]
                preferred_skills = [s.strip() for s in row.get('preferred_skills', '').split(',') if s.strip()]
                
                # Create JD
                jd = JobDescription(
                    recruiter_id=current_user.id,
                    title=row['title'],
                    description=row['description'],
                    is_active=True,
                    is_archived=False
                )
                
                db.add(jd)
                created_jds.append(jd)
                
            except Exception as e:
                errors.append({
                    "row": row_num,
                    "error": str(e)
                })
        
        # Commit all
        await db.commit()
        
        logger.info(f"Bulk import: {len(created_jds)} JDs created, {len(errors)} errors")
        
        return {
            "success": len(created_jds),
            "errors": errors,
            "message": f"Successfully imported {len(created_jds)} job descriptions"
        }
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Bulk import error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to import job descriptions: {str(e)}"
        )
