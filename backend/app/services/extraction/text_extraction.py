"""
Enhanced Text Extraction Service - 100% Local & Free.

Uses the new LocalCVExtractor for accurate text extraction:
- PDF structured → Docling (IBM) or PyMuPDF enhanced
- PDF scanned → EasyOCR enhanced
- DOCX → python-docx enhanced with table extraction
- Images → EasyOCR enhanced

Focus: Extract text EXACTLY as it appears in CVs without assumptions.
"""
import asyncio
from typing import Tuple, Optional, Dict, Any

from app.services.extraction.local_cv_extractor import local_cv_extractor
from app.utils.logger import logger


class EnhancedTextExtractionService:
    """
    Enhanced service using LocalCVExtractor for accurate text extraction.
    
    Strategy:
    - Use LocalCVExtractor for all document types
    - EasyOCR for scanned PDFs and images
    - Focus on extracting text EXACTLY as it appears
    
    The LocalCVExtractor handles:
    - PDF: Docling → PyMuPDF enhanced → EasyOCR → fallback
    - DOCX: python-docx enhanced with tables
    - Images: EasyOCR enhanced
    """
    
    # Timeouts
    EXTRACTION_TIMEOUT_SECONDS = 120  # Increased for large PDFs with OCR
    OCR_FALLBACK_TIMEOUT_SECONDS = 180
    
    # Minimum word count
    MIN_WORD_COUNT = 3  # Reduced for better CV handling
    
    def __init__(self):
        """Initialize enhanced extraction service."""
        logger.info("Enhanced Text Extraction Service initialized with LocalCVExtractor")

    async def extract_text(
        self,
        file_content: bytes,
        file_format: str
    ) -> Tuple[Optional[str], Optional[str], Optional[int], str]:
        """
        Extract text from file using LocalCVExtractor.
        
        Args:
            file_content: File content bytes
            file_format: File format (pdf, docx, jpg, png)
            
        Returns:
            Tuple of (extracted_text, detected_language, word_count, method)
        """
        try:
            logger.info(f"Starting enhanced text extraction for {file_format}")
            
            # Use LocalCVExtractor for primary extraction
            extraction_result = await asyncio.wait_for(
                asyncio.to_thread(
                    local_cv_extractor.extract_text,
                    file_content,
                    file_format
                ),
                timeout=self.EXTRACTION_TIMEOUT_SECONDS
            )
            
            text = extraction_result.get('text', '')
            method = extraction_result.get('method', 'unknown')
            word_count = extraction_result.get('word_count', 0)
            sections = extraction_result.get('sections', {})
            
            logger.info(f"LocalCVExtractor used method: {method}")
            
            # If extraction failed or insufficient text, log warning
            if not text or not text.strip() or word_count < self.MIN_WORD_COUNT:
                logger.warning(f"Primary extraction insufficient ({word_count} words)")
            
            if not text or not text.strip():
                logger.warning("No text extracted from document")
                return None, None, 0, method
            
            # Validate minimum word count
            if word_count < self.MIN_WORD_COUNT:
                logger.warning(
                    f"Insufficient text: {word_count} words "
                    f"(minimum: {self.MIN_WORD_COUNT})"
                )
                return None, None, word_count, method
            
            # Detect language
            detected_language = self._detect_language(text)
            
            logger.info(
                f"Enhanced text extraction successful: {word_count} words, "
                f"language: {detected_language}, method: {method}"
            )
            
            # Log sections if detected
            if sections:
                logger.info(f"Detected CV sections: {list(sections.keys())}")
            
            return text, detected_language, word_count, method
            
        except asyncio.TimeoutError:
            logger.error(f"Text extraction timeout for {file_format}")
            return None, None, None, "timeout"
        except Exception as e:
            logger.error(f"Enhanced text extraction error: {str(e)}")
            return None, None, None, "error"

    async def _pdf_to_ocr_fallback(self, file_content: bytes) -> Optional[str]:
        """PDF fallback - not needed since LocalCVExtractor handles this."""
        return None
    
    def _detect_language(self, text: str) -> str:
        """
        Detect document language.
        
        Args:
            text: Extracted text
            
        Returns:
            Language code (ar, en, fr)
        """
        # Simple language detection based on character sets
        # Count Arabic characters
        arabic_chars = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
        
        # Count French-specific characters
        french_chars = sum(1 for c in text if c in 'àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ')
        
        total_chars = len([c for c in text if c.isalpha()])
        
        if total_chars == 0:
            return 'en'  # Default to English
        
        # Calculate ratios
        arabic_ratio = arabic_chars / total_chars if total_chars > 0 else 0
        french_ratio = french_chars / total_chars if total_chars > 0 else 0
        
        # Determine language
        if arabic_ratio > 0.3:
            return 'ar'
        elif french_ratio > 0.05:
            return 'fr'
        else:
            return 'en'


# Global enhanced text extraction service instance
text_extraction_service = EnhancedTextExtractionService()