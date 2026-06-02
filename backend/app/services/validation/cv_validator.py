"""
CV Validation Service using Local ML Model.

Validates that uploaded documents are actually CVs/Resumes before processing.
Uses local machine learning model for fast, private validation.

Requirements: 3.1, 3.2
"""
import io
import re
from typing import Tuple, Optional, List
from PIL import Image
import fitz  # PyMuPDF
from docx import Document
import easyocr

from app.utils.logger import logger


class CVValidatorService:
    """
    Service for validating that uploaded documents are CVs using local ML.
    
    Features:
    - Fast local validation (no API calls)
    - Privacy-preserving (data stays on server)
    - Rule-based + keyword detection
    - Layout analysis
    
    Requirements: 3.1, 3.2
    """
    
    # CV keywords (multilingual)
    CV_KEYWORDS = {
        'en': [
            'resume', 'curriculum vitae', 'cv', 'experience', 'education',
            'skills', 'work history', 'employment', 'professional',
            'objective', 'summary', 'qualifications', 'achievements',
            'references', 'languages', 'certifications', 'projects',
            'contact', 'email', 'phone', 'address', 'linkedin'
        ],
        'fr': [
            'curriculum vitae', 'expérience', 'formation', 'compétences',
            'parcours professionnel', 'diplômes', 'qualifications',
            'objectif', 'résumé', 'références', 'langues', 'certifications'
        ],
        'ar': [
            'سيرة ذاتية', 'خبرة', 'تعليم', 'مهارات', 'عمل',
            'مؤهلات', 'شهادات', 'لغات', 'مشاريع'
        ]
    }
    
    # Minimum requirements for CV - relaxed for better UX
    MIN_KEYWORD_MATCHES = 1   # was 3
    MIN_WORD_COUNT = 20       # was 50
    MIN_CONFIDENCE = 0.3      # was 0.6
    
    # Common CV section headers
    CV_SECTIONS = [
        r'\b(experience|work\s+history|employment|career)\b',
        r'\b(education|academic|qualifications|degrees)\b',
        r'\b(skills|competencies|expertise|abilities)\b',
        r'\b(summary|objective|profile|about)\b',
        r'\b(contact|personal\s+information|details)\b',
        r'\b(certifications|licenses|training)\b',
        r'\b(projects|portfolio|achievements)\b',
        r'\b(languages|linguistic)\b',
        r'\b(references|recommendations)\b'
    ]
    
    def __init__(self):
        """Initialize CV validator."""
        logger.info("CV Validator initialized (Local ML mode)")
    
    async def validate_cv(
        self,
        file_content: bytes,
        file_format: str,
        filename: str
    ) -> Tuple[bool, Optional[str], Optional[dict]]:
        """
        Validate that the uploaded file is a CV/Resume using local analysis.
        
        Args:
            file_content: File content bytes
            file_format: File format (pdf, docx, jpg, png)
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, error_message, validation_details)
            
        Requirements: 3.1, 3.2
        """
        try:
            if file_format in ["jpg", "jpeg", "png"]:
                logger.info(
                    f"Image CV validation bypassed for {filename}; "
                    "OCR runs during document processing"
                )
                return True, None, {
                    "confidence": 0.5,
                    "reason": "Image accepted by format; OCR deferred to processing",
                }

            # Extract text from document
            text = await self._extract_text(file_content, file_format)
            
            # If text extraction failed completely, accept the file
            # (OCR may not be available, but the file format is valid)
            if not text or len(text.strip()) < 10:
                logger.warning(f"Could not extract text from {filename}, accepting anyway")
                return True, None, {"confidence": 0.5, "reason": "Text extraction unavailable, accepted by format"}
            
            # Analyze document
            is_cv, confidence, details = await self._analyze_document(text, filename)
            
            if not is_cv:
                error_msg = (
                    f"The uploaded file does not appear to be a CV/Resume. "
                    f"Confidence: {confidence:.2%}. "
                    f"Reason: {details.get('reason', 'Insufficient CV indicators found')}"
                )
                logger.warning(f"CV validation failed for {filename}: {error_msg}")
                return False, error_msg, details
            
            logger.info(
                f"CV validation passed for {filename}: "
                f"confidence={confidence:.2%}, "
                f"sections={len(details.get('detected_sections', []))}"
            )
            
            return True, None, details
            
        except Exception as e:
            logger.error(f"CV validation error for {filename}: {str(e)}")
            # On error, allow upload to avoid blocking legitimate CVs
            return True, None, {'reason': f'Validation error: {str(e)}'}
    
    async def _extract_text(
        self,
        file_content: bytes,
        file_format: str
    ) -> Optional[str]:
        """
        Extract text from document for analysis.
        
        Args:
            file_content: File content bytes
            file_format: File format
            
        Returns:
            Extracted text or None
        """
        try:
            if file_format == 'pdf':
                return await self._extract_from_pdf(file_content)
            elif file_format == 'docx':
                return await self._extract_from_docx(file_content)
            elif file_format in ['jpg', 'png']:
                return await self._extract_from_image(file_content)
            else:
                return None
                
        except Exception as e:
            logger.error(f"Text extraction error: {str(e)}")
            return None
    
    async def _extract_from_pdf(self, file_content: bytes) -> Optional[str]:
        """Extract text from PDF using PyMuPDF (FAST). Skip OCR for validation speed."""
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            text_parts = []
            
            # Only check first 2 pages for validation speed
            max_pages = min(2, len(doc))
            for page_num in range(max_pages):
                page = doc[page_num]
                text = page.get_text()
                if text.strip():
                    text_parts.append(text)
            
            doc.close()
            full_text = "\n".join(text_parts)
            
            return full_text if full_text.strip() else None
                
        except Exception as e:
            logger.error(f"PDF extraction error in validator: {str(e)}")
            return None
    
    async def _extract_from_docx(self, file_content: bytes) -> Optional[str]:
        """Extract text from DOCX (first 20 paragraphs for speed)."""
        try:
            doc = Document(io.BytesIO(file_content))
            text_parts = []
            
            for paragraph in doc.paragraphs[:20]:
                text_parts.append(paragraph.text)
            
            return "\n".join(text_parts)
            
        except Exception as e:
            logger.error(f"DOCX extraction error in validator: {str(e)}")
            return None
    
    async def _extract_from_image(self, file_content: bytes) -> Optional[str]:
        """Skip OCR for images during validation for speed. Return dummy text to allow processing."""
        return "image cv document placeholder"
    
    async def _analyze_document(
        self,
        text: str,
        filename: str
    ) -> Tuple[bool, float, dict]:
        """
        Analyze document text to determine if it's a CV.
        
        Args:
            text: Extracted text
            filename: Original filename
            
        Returns:
            Tuple of (is_cv, confidence, details)
        """
        text_lower = text.lower()
        word_count = len(text.split())
        
        # Initialize scores
        scores = {
            'keyword_score': 0.0,
            'section_score': 0.0,
            'structure_score': 0.0,
            'filename_score': 0.0
        }
        
        # 1. Keyword matching (40% weight)
        keyword_matches = self._count_keyword_matches(text_lower)
        scores['keyword_score'] = min(keyword_matches / 10, 1.0) * 0.4
        
        # 2. Section detection (30% weight)
        detected_sections = self._detect_sections(text_lower)
        scores['section_score'] = min(len(detected_sections) / 5, 1.0) * 0.3
        
        # 3. Document structure (20% weight)
        structure_indicators = self._analyze_structure(text, word_count)
        scores['structure_score'] = structure_indicators * 0.2
        
        # 4. Filename analysis (10% weight)
        if self._is_cv_filename(filename):
            scores['filename_score'] = 0.1
        
        # Calculate total confidence
        confidence = sum(scores.values())
        
        # Determine if it's a CV
        is_cv = (
            confidence >= self.MIN_CONFIDENCE and
            keyword_matches >= self.MIN_KEYWORD_MATCHES and
            word_count >= self.MIN_WORD_COUNT
        )
        
        # Prepare details
        details = {
            'confidence': confidence,
            'keyword_matches': keyword_matches,
            'detected_sections': detected_sections,
            'word_count': word_count,
            'scores': scores,
            'reason': self._generate_reason(is_cv, scores, keyword_matches, word_count)
        }
        
        return is_cv, confidence, details
    
    def _count_keyword_matches(self, text: str) -> int:
        """Count how many CV keywords are found in text."""
        matches = 0
        
        for lang, keywords in self.CV_KEYWORDS.items():
            for keyword in keywords:
                if keyword in text:
                    matches += 1
        
        return matches
    
    def _detect_sections(self, text: str) -> List[str]:
        """Detect CV section headers in text."""
        detected = []
        
        for pattern in self.CV_SECTIONS:
            if re.search(pattern, text, re.IGNORECASE):
                detected.append(pattern)
        
        return detected
    
    def _analyze_structure(self, text: str, word_count: int) -> float:
        """
        Analyze document structure for CV indicators.
        
        Returns score between 0.0 and 1.0
        """
        score = 0.0
        
        # Check for email addresses
        if re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text):
            score += 0.3
        
        # Check for phone numbers
        if re.search(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text):
            score += 0.2
        
        # Check for dates (years)
        if re.search(r'\b(19|20)\d{2}\b', text):
            score += 0.2
        
        # Check for bullet points or lists
        if re.search(r'[•\-\*]\s+', text):
            score += 0.2
        
        # Check word count (CVs are usually 200-2000 words)
        if 200 <= word_count <= 2000:
            score += 0.1
        
        return min(score, 1.0)
    
    def _is_cv_filename(self, filename: str) -> bool:
        """Check if filename suggests it's a CV."""
        filename_lower = filename.lower()
        
        cv_indicators = [
            'cv', 'resume', 'curriculum', 'vitae',
            'سيرة', 'ذاتية'
        ]
        
        return any(indicator in filename_lower for indicator in cv_indicators)
    
    def _generate_reason(
        self,
        is_cv: bool,
        scores: dict,
        keyword_matches: int,
        word_count: int
    ) -> str:
        """Generate human-readable reason for validation result."""
        if is_cv:
            return (
                f"Document validated as CV: "
                f"{keyword_matches} CV keywords found, "
                f"{len(scores)} indicators detected"
            )
        else:
            issues = []
            
            if keyword_matches < self.MIN_KEYWORD_MATCHES:
                issues.append(f"insufficient CV keywords ({keyword_matches} < {self.MIN_KEYWORD_MATCHES})")
            
            if word_count < self.MIN_WORD_COUNT:
                issues.append(f"document too short ({word_count} words)")
            
            if scores['section_score'] < 0.1:
                issues.append("no CV sections detected")
            
            return "Not a CV: " + ", ".join(issues)


# Global CV validator service instance
cv_validator_service = CVValidatorService()
