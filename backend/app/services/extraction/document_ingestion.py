"""
Document Ingestion Service.

Orchestrates file upload, validation, virus scanning, and text extraction.

Requirements: 3.1, 3.2, 3.3, 3.10, 3.11
"""
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Tuple, Optional
from uuid import UUID
import aiofiles

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cv_document import CVDocument
from app.services.validation.file_validation import file_validation_service
from app.services.validation.virus_scanner import virus_scanner_service
from app.services.extraction.text_extraction import text_extraction_service
from app.services.validation.cv_validator import cv_validator_service
from app.core.config import settings
from app.utils.logger import logger


class DocumentIngestionService:
    """
    Service for handling document upload and initial processing.
    
    Workflow:
    1. Validate file format and size
    2. Scan for viruses
    3. Store original file
    4. Extract text
    5. Create database record
    6. Queue for further processing (Celery task)
    
    Requirements: 3.1, 3.2, 3.3, 3.10, 3.11
    """
    
    # Performance target: return document_id within 2 seconds
    PERFORMANCE_TARGET_SECONDS = 2.0
    
    async def upload_cv(
        self,
        file_content: bytes,
        filename: str,
        user_id: UUID,
        db: AsyncSession
    ) -> Tuple[Optional[CVDocument], Optional[str]]:
        """
        Upload and process CV document.
        
        Args:
            file_content: File content bytes
            filename: Original filename
            user_id: User ID
            db: Database session
            
        Returns:
            Tuple of (cv_document, error_message)
            
        Requirements: 3.1, 3.2, 3.3, 3.10, 3.11
        """
        start_time = time.time()
        
        try:
            # Step 1: Validate file format and size
            is_valid, error_msg, detected_format = file_validation_service.validate(
                file_content,
                filename
            )
            
            if not is_valid:
                logger.warning(f"File validation failed: {error_msg}")
                return None, error_msg
            
            # Step 2: Validate that file is actually a CV (Local ML)
            is_cv, cv_error, cv_details = await cv_validator_service.validate_cv(
                file_content,
                detected_format,
                filename
            )
            
            if not is_cv:
                logger.warning(f"CV validation failed: {cv_error}")
                return None, cv_error
            
            logger.info(
                f"CV validation passed: {filename} "
                f"(confidence: {cv_details.get('confidence', 0):.2%})"
            )
            
            # Step 3: Virus scan
            is_clean, virus_name = await virus_scanner_service.scan_file(
                file_content,
                filename
            )
            
            if not is_clean:
                error_msg = f"Virus detected: {virus_name}"
                logger.warning(f"Virus scan failed: {error_msg}")
                
                # Create document record with infected status
                cv_document = CVDocument(
                    user_id=user_id,
                    original_filename=filename,
                    file_path="",  # Not stored
                    file_size_bytes=len(file_content),
                    file_format=detected_format,
                    processing_status='failed',
                    virus_scan_status='infected',
                    virus_scan_at=datetime.now(timezone.utc)
                )
                db.add(cv_document)
                await db.commit()
                
                return None, error_msg
            
            # Step 3: Store file
            file_path = await self._store_file(
                file_content,
                filename,
                user_id,
                detected_format
            )
            
            # Step 4: Create database record
            cv_document = CVDocument(
                user_id=user_id,
                original_filename=filename,
                file_path=file_path,
                file_size_bytes=len(file_content),
                file_format=detected_format,
                processing_status='pending',
                virus_scan_status='clean',
                virus_scan_at=datetime.now(timezone.utc),
                retention_until=datetime.now(timezone.utc) + timedelta(days=90)
            )
            
            db.add(cv_document)
            await db.commit()
            await db.refresh(cv_document)
            
            elapsed_time = time.time() - start_time
            
            # Check performance target
            if elapsed_time > self.PERFORMANCE_TARGET_SECONDS:
                logger.warning(
                    f"Document ingestion exceeded target: "
                    f"{elapsed_time:.2f}s > {self.PERFORMANCE_TARGET_SECONDS}s"
                )
            else:
                logger.info(
                    f"Document ingestion completed in {elapsed_time:.2f}s"
                )
            
            # Step 5: Queue extraction task (synchronous in dev, Celery in production)
            # DEFERRED: Replace with Celery async task in production deployment
            logger.info(f"Document uploaded successfully: {cv_document.id}")
            
            return cv_document, None
            
        except Exception as e:
            logger.error(f"Document ingestion error: {str(e)}")
            await db.rollback()
            return None, "Failed to upload document"
    
    async def _store_file(
        self,
        file_content: bytes,
        filename: str,
        user_id: UUID,
        file_format: str
    ) -> str:
        """
        Store file in uploads directory.
        
        Args:
            file_content: File content bytes
            filename: Original filename
            user_id: User ID
            file_format: File format
            
        Returns:
            File path
            
        Requirements: 3.10
        """
        try:
            # Create user directory
            user_dir = os.path.join(settings.UPLOAD_DIR, str(user_id))
            os.makedirs(user_dir, exist_ok=True)
            
            # Generate unique filename
            timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
            safe_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(user_dir, safe_filename)
            
            # Write file
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            # Set file permissions (no execute)
            os.chmod(file_path, 0o644)
            
            logger.info(f"File stored: {file_path}")
            
            return file_path
            
        except Exception as e:
            logger.error(f"File storage error: {str(e)}")
            raise
    
    async def process_document(
        self,
        document_id: UUID,
        db: AsyncSession,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Process document: extract text, detect language, and mask PII.
        
        This is called by Celery task after upload.
        
        Args:
            document_id: Document ID
            db: Database session
            
        Returns:
            Tuple of (success, error_message)
            
        Requirements: 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.8
        """
        try:
            # Get document
            from sqlalchemy import select
            result = await db.execute(
                select(CVDocument).where(CVDocument.id == document_id)
            )
            document = result.scalar_one_or_none()
            
            if not document:
                return False, "Document not found"
            
            # Update status
            document.processing_status = 'processing'
            document.status_message = "Starting deep analysis..."
            await db.commit()
            
            # Read file
            async with aiofiles.open(document.file_path, 'rb') as f:
                file_content = await f.read()
            
            # Extract text
            extracted_text, detected_language, word_count, method = await text_extraction_service.extract_text(
                file_content,
                document.file_format
            )
            
            # Map method to human readable status
            status_map = {
                'pymupdf_fast': "Fast text extraction completed.",
                'docling': "Deep structural analysis completed (Docling).",
                'easyocr_enhanced': "OCR image analysis completed.",
                'python-docx_enhanced': "Word document extraction completed.",
                'pymupdf_fallback': "Basic text extraction completed."
            }
            document.status_message = status_map.get(method, "Text extraction completed.")
            
            if not extracted_text:
                # For images: the OCR might have failed — mark as failed with clear message
                file_fmt = document.file_format or ''
                is_image = file_fmt.lower() in ['jpg', 'jpeg', 'png']
                logger.warning(f"Text extraction returned empty for {document_id} (format: {file_fmt}), marking as failed")
                document.extracted_text = ""
                document.masked_text = ""
                document.detected_language = 'en'
                document.word_count = 0
                document.processing_status = 'failed'
                document.status_message = (
                    "Could not extract text from this image. "
                    "Please ensure the image is clear, high-resolution, and contains readable text. "
                    "Try uploading a PDF or DOCX version instead."
                    if is_image else
                    "Could not extract text from this file. "
                    "Please ensure it is a text-based PDF or DOCX (not a scanned image). "
                    "Try re-uploading a higher quality version."
                )
                await db.commit()
                return False, document.status_message
            
            # Update document with extracted text
            document.extracted_text = extracted_text
            document.detected_language = detected_language or 'en'
            document.word_count = word_count
            await db.commit()
            
            # Process through Privacy Gateway to generate masked_text
            document.status_message = "Securing data (PII Masking)..."
            await db.commit()
            
            from app.services.privacy.privacy_gateway import privacy_gateway
            
            logger.info(f"Running Privacy Gateway for document {document_id}")
            masked_text, pii_mappings = await privacy_gateway.mask_pii(
                text=extracted_text,
                user_id=document.user_id,
                document_id=document.id,
                language=document.detected_language,
                db=db,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            # Update document with masked text
            document.masked_text = masked_text
            document.processing_status = 'processing' # Stay in processing
            document.status_message = "Document secured. AI starting skill extraction..."
            await db.commit()

            # Stage 2: RAG Pipeline - Semantic Vector Matching (Anonymization-First)
            try:
                from app.services.nlp.rag_pipeline import rag_pipeline
                logger.info(f"Generating embeddings for masked text of document {document_id}")
                await rag_pipeline.chunk_and_embed(
                    document_id=document.id,
                    text=masked_text,
                    language=document.detected_language
                )
            except Exception as rag_e:
                logger.error(f"RAG embedding failed for {document_id}: {rag_e}")
                # Non-fatal — continue without embeddings

            # ✅ Mark as completed
            document.processing_status = 'completed'
            document.status_message = "Document ready for analysis."
            await db.commit()

            logger.info(
                f"Document processed successfully: {document_id} "
                f"({word_count} words, language: {detected_language}, "
                f"{len(pii_mappings)} PII entities masked)"
            )
            
            return True, None
            
        except Exception as e:
            logger.error(f"Document processing error: {str(e)}")
            
            # Update status to failed
            if document:
                document.processing_status = 'failed'
                await db.commit()
            
            return False, str(e)


# Global document ingestion service instance
document_ingestion_service = DocumentIngestionService()
