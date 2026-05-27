"""
Testimonials API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List

from app.core.database import get_db
from app.models.testimonial import Testimonial
from app.models.user import User
from app.schemas.testimonial import (
    TestimonialCreate,
    TestimonialUpdate,
    TestimonialResponse,
    TestimonialPublic
)
from app.services.auth.dependencies import get_current_user, require_role

router = APIRouter()


@router.get("/public", response_model=List[TestimonialPublic])
async def get_public_testimonials(
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get approved and featured testimonials for landing page (public endpoint)
    """
    result = await db.execute(
        select(Testimonial).where(
            and_(
                Testimonial.is_approved == True,
                Testimonial.is_featured == True
            )
        ).order_by(Testimonial.created_at.desc()).limit(limit)
    )
    testimonials = result.scalars().all()
    return testimonials


@router.get("/my", response_model=List[TestimonialResponse])
async def get_my_testimonials(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's testimonials
    """
    result = await db.execute(
        select(Testimonial).where(Testimonial.user_id == current_user.id)
    )
    testimonials = result.scalars().all()
    return testimonials


@router.get("/", response_model=List[TestimonialResponse])
async def get_all_testimonials(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all testimonials (admin only)
    """
    result = await db.execute(
        select(Testimonial).offset(skip).limit(limit)
    )
    testimonials = result.scalars().all()
    return testimonials


@router.post("/", response_model=TestimonialResponse, status_code=status.HTTP_201_CREATED)
async def create_testimonial(
    testimonial_data: TestimonialCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new testimonial
    """
    testimonial = Testimonial(
        user_id=current_user.id,
        **testimonial_data.model_dump()
    )
    db.add(testimonial)
    await db.commit()
    await db.refresh(testimonial)
    return testimonial


@router.get("/{testimonial_id}", response_model=TestimonialResponse)
async def get_testimonial(
    testimonial_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific testimonial (admin only)
    """
    result = await db.execute(
        select(Testimonial).where(Testimonial.id == testimonial_id)
    )
    testimonial = result.scalar_one_or_none()
    if not testimonial:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testimonial not found")
    return testimonial


@router.patch("/{testimonial_id}", response_model=TestimonialResponse)
async def update_testimonial(
    testimonial_id: int,
    testimonial_data: TestimonialUpdate,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a testimonial (admin only)
    """
    result = await db.execute(
        select(Testimonial).where(Testimonial.id == testimonial_id)
    )
    testimonial = result.scalar_one_or_none()
    if not testimonial:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testimonial not found")

    update_data = testimonial_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(testimonial, field, value)

    await db.commit()
    await db.refresh(testimonial)
    return testimonial


@router.delete("/{testimonial_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_testimonial(
    testimonial_id: int,
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a testimonial (admin only)
    """
    result = await db.execute(
        select(Testimonial).where(Testimonial.id == testimonial_id)
    )
    testimonial = result.scalar_one_or_none()
    if not testimonial:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testimonial not found")

    await db.delete(testimonial)
    await db.commit()
    return None
