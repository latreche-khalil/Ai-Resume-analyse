"""
PDF Preview endpoints for converting CV PDFs to images.
"""
import os
import base64
from typing import List, Dict, Any
from uuid import UUID
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.auth.dependencies import get_current_user
from app.models.user import User
from app.models.cv_document import CVDocument
from app.utils.logger import logger

router = APIRouter(prefix="/pdf-preview")


@router.get("/{document_id}/images")
async def get_cv_as_images(
    document_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Convert CV PDF to base64 images for preview.
    
    Returns:
        List of base64 encoded images (one per page)
    """
    try:
        # Get CV document
        from sqlalchemy import select
        result = await db.execute(
            select(CVDocument).where(
                CVDocument.id == document_id,
                CVDocument.user_id == current_user.id,
                CVDocument.deleted_at.is_(None)
            )
        )
        cv_document = result.scalar_one_or_none()
        
        if not cv_document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CV document not found"
            )
        
        if not cv_document.file_path or not os.path.exists(cv_document.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CV file not found on disk"
            )
        
        # Convert PDF to images
        images = await convert_pdf_to_images(cv_document.file_path)
        
        return {
            "document_id": str(document_id),
            "filename": cv_document.original_filename,
            "total_pages": len(images),
            "images": images
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF preview error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF preview"
        )


async def convert_pdf_to_images(pdf_path: str, max_pages: int = 5) -> List[str]:
    """
    Convert PDF to base64 encoded images.
    
    Args:
        pdf_path: Path to PDF file
        max_pages: Maximum pages to convert (limit for performance)
        
    Returns:
        List of base64 encoded images
    """
    try:
        import fitz  # PyMuPDF
        
        images = []
        pdf_document = fitz.open(pdf_path)
        
        try:
            # Limit pages for performance
            total_pages = min(len(pdf_document), max_pages)
            
            for page_num in range(total_pages):
                page = pdf_document[page_num]
                
                # Render page as image (300 DPI for good quality)
                mat = fitz.Matrix(2.0, 2.0)  # 2x zoom = ~300 DPI
                pix = page.get_pixmap(matrix=mat)
                
                # Convert to PNG bytes
                img_data = pix.tobytes("png")
                
                # Encode as base64
                img_base64 = base64.b64encode(img_data).decode('utf-8')
                
                images.append({
                    "page": page_num + 1,
                    "image": f"data:image/png;base64,{img_base64}",
                    "width": pix.width,
                    "height": pix.height
                })
            
            logger.info(f"Converted {total_pages} pages to images")
            return images
            
        finally:
            # Always close PDF document to prevent resource leak
            pdf_document.close()
        
    except ImportError:
        logger.warning("PyMuPDF not available, using fallback method")
        return await convert_pdf_fallback(pdf_path, max_pages)
    except Exception as e:
        logger.error(f"PDF conversion error: {str(e)}")
        return []


async def convert_pdf_fallback(pdf_path: str, max_pages: int = 5) -> List[str]:
    """
    Fallback PDF conversion using pdf2image.
    """
    try:
        from pdf2image import convert_from_path
        from PIL import Image
        
        # Convert PDF to PIL images
        pages = convert_from_path(pdf_path, dpi=200, first_page=1, last_page=max_pages)
        
        images = []
        for i, page in enumerate(pages):
            # Convert PIL image to base64
            buffer = BytesIO()
            page.save(buffer, format='PNG', optimize=True, quality=85)
            img_data = buffer.getvalue()
            
            img_base64 = base64.b64encode(img_data).decode('utf-8')
            
            images.append({
                "page": i + 1,
                "image": f"data:image/png;base64,{img_base64}",
                "width": page.width,
                "height": page.height
            })
        
        logger.info(f"Fallback: Converted {len(pages)} pages to images")
        return images
        
    except ImportError:
        logger.error("Neither PyMuPDF nor pdf2image available")
        return []
    except Exception as e:
        logger.error(f"Fallback PDF conversion error: {str(e)}")
        return []