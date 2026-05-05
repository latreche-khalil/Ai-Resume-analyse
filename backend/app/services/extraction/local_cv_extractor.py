"""
Local CV Extractor - 100% Free and Local Stack.

Enhanced version that works with available libraries and provides
accurate text extraction exactly as it appears in CVs.

Uses the best free and local libraries:
- PyMuPDF - for text-based PDFs (always available)
- python-docx - for DOCX files (always available)
- Docling (IBM) - for structured PDFs (optional, best accuracy)
- EasyOCR - for scanned PDFs and images (optional)

All processing is done locally, no external APIs required.
"""
import os
import tempfile
import re
import unicodedata
from typing import Dict, Any, Optional, List
from pathlib import Path
from io import BytesIO

import fitz  # PyMuPDF
from docx import Document

from app.utils.logger import logger

# Check if optional libraries are available (but don't import yet - lazy loading)
DOCLING_AVAILABLE = False
EASYOCR_AVAILABLE = False

try:
    import importlib.util
    if importlib.util.find_spec("docling") is not None:
        DOCLING_AVAILABLE = True
        logger.info("Docling (IBM) available for advanced PDF processing (lazy loading)")
except Exception:
    pass

try:
    import importlib.util
    if importlib.util.find_spec("easyocr") is not None:
        EASYOCR_AVAILABLE = True
        logger.info("EasyOCR available for scanned documents (lazy loading)")
except Exception:
    pass


class LocalCVExtractor:
    """
    100% Local and Free CV Text Extractor.
    
    Enhanced Strategy for Maximum Accuracy:
    1. PDF structured → Docling (IBM) - best accuracy (if available)
    2. PDF text-based → PyMuPDF with enhanced cleaning
    3. PDF scanned → EasyOCR (if available) or fallback to PyMuPDF
    4. DOCX → python-docx with table extraction
    5. Images → EasyOCR (if available)
    
    Focus: Extract text EXACTLY as it appears in the CV without assumptions.
    """
    
    def __init__(self):
        """Initialize local extractor with lazy loading for heavy libraries."""
        self.docling_converter = None
        self.ocr_reader = None
        self._docling_initialized = False
        self._easyocr_initialized = False
        
        logger.info("LocalCVExtractor initialized (lazy loading enabled)")
    
    def extract_text(self, file_content: bytes, file_format: str) -> Dict[str, Any]:
        """
        Extract text from file using the best local method.
        
        Args:
            file_content: File content as bytes
            file_format: File format (pdf, docx, jpg, png)
            
        Returns:
            Dictionary with extracted text and metadata
        """
        logger.info(f"Starting enhanced local extraction for {file_format}")
        
        try:
            if file_format == 'pdf':
                return self._extract_pdf_enhanced(file_content)
            elif file_format == 'docx':
                return self._extract_docx_enhanced(file_content)
            elif file_format in ['jpg', 'jpeg', 'png']:
                return self._extract_image_enhanced(file_content)
            else:
                raise ValueError(f"Unsupported format: {file_format}")
                
        except Exception as e:
            logger.error(f"Enhanced local extraction failed: {e}")
            return {
                'text': '',
                'method': 'failed',
                'error': str(e),
                'word_count': 0,
                'sections': {}
            }
    
    def _initialize_docling(self):
        """Lazy initialization of Docling (only when needed)."""
        if self._docling_initialized:
            return
        
        if not DOCLING_AVAILABLE:
            logger.warning("Docling not available")
            return
        
        try:
            from docling.document_converter import DocumentConverter
            self.docling_converter = DocumentConverter()
            self._docling_initialized = True
            logger.info("Docling converter initialized (lazy)")
        except Exception as e:
            logger.warning(f"Failed to initialize Docling: {e}")
            self.docling_converter = None
    
    def _initialize_easyocr(self):
        """Lazy initialization of EasyOCR (only when needed)."""
        if self._easyocr_initialized:
            return
        
        if not EASYOCR_AVAILABLE:
            logger.warning("EasyOCR not available")
            return
        
        try:
            import easyocr
            # Initialize EasyOCR with English first (more stable)
            # Arabic can be added later if needed
            self.ocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
            self._easyocr_initialized = True
            logger.info("EasyOCR reader initialized with English (lazy)")
        except Exception as e:
            logger.warning(f"Failed to initialize EasyOCR: {e}")
            self.ocr_reader = None
    
    def _extract_pdf_enhanced(self, file_content: bytes) -> Dict[str, Any]:
        """Enhanced PDF extraction with multiple strategies."""
        
        file_size_kb = len(file_content) / 1024
        
        # Strategy 1: Try Docling first (best for structured PDFs) - LAZY LOAD
        # Increased limit to 2000KB (2MB) as CVs with images easily exceed 300KB
        if DOCLING_AVAILABLE and not self._docling_initialized and file_size_kb <= 2000:
            self._initialize_docling()
        
        if self.docling_converter and file_size_kb <= 2000:
            tmp_file_path = None
            try:
                logger.info("Trying Docling (IBM) extraction...")
                
                # Save to temporary file (Docling needs file path)
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                    tmp_file.write(file_content)
                    tmp_file.flush()
                    tmp_file_path = tmp_file.name
                
                # Convert using Docling
                result = self.docling_converter.convert(tmp_file_path)
                text = result.document.export_to_markdown()
                
                if len(text.strip()) > 50:  # Good extraction
                    logger.info(f"Docling extraction successful: {len(text)} chars")
                    cleaned_text = self._clean_text_enhanced(text)
                    
                    return {
                        'text': cleaned_text,
                        'method': 'docling',
                        'structured_data': result.document.export_to_dict(),
                        'word_count': len(cleaned_text.split()),
                        'sections': self._detect_sections(cleaned_text)
                    }
                        
            except Exception as e:
                logger.warning(f"Docling extraction failed: {e}")
            finally:
                # Clean up temp file
                if tmp_file_path and os.path.exists(tmp_file_path):
                    try:
                        os.unlink(tmp_file_path)
                    except Exception as cleanup_err:
                        logger.warning(f"Failed to cleanup temp file: {cleanup_err}")
        
        # Strategy 2: Enhanced PyMuPDF for text-based PDFs
        logger.info("Trying enhanced PyMuPDF extraction...")
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            
            # Try different text extraction methods
            full_text = self._extract_pdf_text_enhanced(doc)
            doc.close()
            
            # Check if we got meaningful text
            if len(full_text.strip()) > 10:  # Lowered threshold
                logger.info(f"Enhanced PyMuPDF extraction successful: {len(full_text)} chars")
                cleaned_text = self._clean_text_enhanced(full_text)
                return {
                    'text': cleaned_text,
                    'method': 'pymupdf_enhanced',
                    'word_count': len(cleaned_text.split()),
                    'sections': self._detect_sections(cleaned_text)
                }
            else:
                logger.info("PyMuPDF found minimal text, trying OCR...")
                
        except Exception as e:
            logger.warning(f"Enhanced PyMuPDF extraction failed: {e}")
        
        # Strategy 3: OCR for scanned PDFs (if available) - LAZY LOAD
        # Skip OCR for very large files (>600KB) to avoid memory issues
        file_size_kb = len(file_content) / 1024
        if file_size_kb > 600:
            logger.warning(f"Skipping OCR for very large file ({file_size_kb:.0f}KB)")
        elif EASYOCR_AVAILABLE and not self._easyocr_initialized:
            self._initialize_easyocr()
        
        if self.ocr_reader and file_size_kb <= 600:
            try:
                logger.info("Trying EasyOCR for scanned PDF...")
                return self._extract_scanned_pdf_enhanced(file_content)
            except Exception as e:
                logger.warning(f"EasyOCR extraction failed: {e}")
        
        # Fallback: Basic PyMuPDF
        try:
            doc = fitz.open(stream=file_content, filetype="pdf")
            text = ''
            for page in doc:
                text += page.get_text('text')
            doc.close()
            
            cleaned_text = self._clean_text_enhanced(text)
            return {
                'text': cleaned_text,
                'method': 'pymupdf_fallback',
                'word_count': len(cleaned_text.split()),
                'sections': self._detect_sections(cleaned_text)
            }
        except Exception as e:
            logger.error(f"All PDF extraction methods failed: {e}")
        
        # Final fallback: return empty
        return {
            'text': '',
            'method': 'failed',
            'word_count': 0,
            'error': 'All PDF extraction methods failed',
            'sections': {}
        }
    
    def _extract_pdf_text_enhanced(self, doc) -> str:
        """Enhanced PDF text extraction using multiple PyMuPDF methods."""
        full_text = ''
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Method 1: Standard text extraction
            text1 = page.get_text('text')
            
            # Method 2: Dictionary-based extraction (preserves formatting better)
            text_dict = page.get_text('dict')
            text2 = self._extract_from_text_dict(text_dict)
            
            # Method 3: Block-based extraction
            blocks = page.get_text('blocks')
            text3 = self._extract_from_blocks(blocks)
            
            # Choose the best extraction (longest meaningful text)
            page_texts = [text1, text2, text3]
            page_text = max(page_texts, key=lambda x: len(x.strip()))
            
            if page_text.strip():
                full_text += page_text + '\n'
                logger.debug(f"Page {page_num + 1}: extracted {len(page_text)} chars")
        
        return full_text
    
    def _extract_from_text_dict(self, text_dict: dict) -> str:
        """Extract text from PyMuPDF text dictionary while preserving structure."""
        text_parts = []
        
        for block in text_dict.get('blocks', []):
            if 'lines' in block:  # Text block
                for line in block['lines']:
                    line_text = ''
                    for span in line.get('spans', []):
                        span_text = span.get('text', '').strip()
                        if span_text:
                            line_text += span_text + ' '
                    
                    if line_text.strip():
                        text_parts.append(line_text.strip())
        
        return '\n'.join(text_parts)
    
    def _extract_from_blocks(self, blocks: List) -> str:
        """Extract text from PyMuPDF blocks."""
        text_parts = []
        
        for block in blocks:
            if len(block) >= 5 and isinstance(block[4], str):  # Text block
                block_text = block[4].strip()
                if block_text:
                    text_parts.append(block_text)
        
        return '\n'.join(text_parts)
    
    def _extract_scanned_pdf_enhanced(self, file_content: bytes) -> Dict[str, Any]:
        """Enhanced OCR extraction from scanned PDF."""
        # Lazy load EasyOCR if not initialized
        if not self._easyocr_initialized:
            self._initialize_easyocr()
        
        if not self.ocr_reader:
            raise Exception("EasyOCR not available")
        
        doc = fitz.open(stream=file_content, filetype="pdf")
        full_text = ''
        
        try:
            # Limit to first 5 pages for safety and speed
            max_pages = min(len(doc), 5)
            for page_num in range(max_pages):
                page = doc[page_num]
                
                # Use 1.5x zoom instead of 3x to avoid memory issues
                # 1.5x gives ~150 DPI which is sufficient for OCR
                pix = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5))
                img_data = pix.tobytes("png")
                
                # Use EasyOCR with confidence filtering
                results = self.ocr_reader.readtext(img_data)
                
                page_text_parts = []
                for (bbox, text, confidence) in results:
                    if confidence > 0.4:  # Lower threshold for better recall
                        page_text_parts.append(text)
                
                if page_text_parts:
                    page_text = ' '.join(page_text_parts)
                    full_text += page_text + '\n'
        
        finally:
            doc.close()
        
        cleaned_text = self._clean_text_enhanced(full_text)
        logger.info(f"Enhanced EasyOCR extraction complete: {len(cleaned_text)} chars")
        return {
            'text': cleaned_text,
            'method': 'easyocr_enhanced',
            'word_count': len(cleaned_text.split()),
            'sections': self._detect_sections(cleaned_text)
        }
    
    def _extract_docx_enhanced(self, file_content: bytes) -> Dict[str, Any]:
        """Enhanced DOCX extraction with better structure preservation."""
        logger.info("Enhanced DOCX extraction using python-docx...")
        
        try:
            # Load document from bytes
            doc = Document(BytesIO(file_content))
            
            # Extract paragraphs with style information
            paragraphs = []
            for p in doc.paragraphs:
                if p.text.strip():
                    paragraphs.append(p.text.strip())
            
            # Extract text from tables (critical for CVs)
            tables_text = []
            for table in doc.tables:
                table_rows = []
                for row in table.rows:
                    row_cells = []
                    for cell in row.cells:
                        if cell.text.strip():
                            row_cells.append(cell.text.strip())
                    if row_cells:
                        table_rows.append(' | '.join(row_cells))
                
                if table_rows:
                    tables_text.extend(table_rows)
            
            # Combine all text while preserving structure
            all_text_parts = paragraphs + tables_text
            full_text = '\n'.join(all_text_parts)
            
            cleaned_text = self._clean_text_enhanced(full_text)
            logger.info(f"Enhanced DOCX extraction successful: {len(cleaned_text)} chars")
            return {
                'text': cleaned_text,
                'method': 'python-docx_enhanced',
                'word_count': len(cleaned_text.split()),
                'sections': self._detect_sections(cleaned_text)
            }
            
        except Exception as e:
            logger.error(f"Enhanced DOCX extraction failed: {e}")
            return {
                'text': '',
                'method': 'failed',
                'word_count': 0,
                'error': str(e),
                'sections': {}
            }
    
    def _extract_image_enhanced(self, file_content: bytes) -> Dict[str, Any]:
        """Enhanced image OCR extraction."""
        # Lazy load EasyOCR if not initialized
        if not self._easyocr_initialized:
            self._initialize_easyocr()
        
        if not self.ocr_reader:
            raise Exception("EasyOCR not available for image processing")
        
        logger.info("Enhanced image extraction using EasyOCR...")
        
        try:
            # Use EasyOCR with enhanced settings
            results = self.ocr_reader.readtext(
                file_content,
                detail=1,  # Return bounding boxes and confidence
                paragraph=True,  # Group text into paragraphs
                width_ths=0.7,  # Text width threshold
                height_ths=0.7  # Text height threshold
            )
            
            # Extract text with spatial awareness
            text_parts = []
            for (bbox, text, confidence) in results:
                if confidence > 0.6 and text.strip():  # Higher confidence threshold
                    text_parts.append(text.strip())
            
            full_text = '\n'.join(text_parts)
            cleaned_text = self._clean_text_enhanced(full_text)
            
            logger.info(f"Enhanced image OCR successful: {len(cleaned_text)} chars")
            return {
                'text': cleaned_text,
                'method': 'easyocr_enhanced',
                'word_count': len(cleaned_text.split()),
                'sections': self._detect_sections(cleaned_text)
            }
            
        except Exception as e:
            logger.error(f"Enhanced image OCR failed: {e}")
            return {
                'text': '',
                'method': 'failed',
                'word_count': 0,
                'error': str(e),
                'sections': {}
            }
    
    def _clean_text_enhanced(self, text: str) -> str:
        """Enhanced text cleaning that preserves CV structure."""
        if not text:
            return ''
        
        # Unicode normalization (critical for Arabic)
        text = unicodedata.normalize('NFKC', text)
        
        # Remove excessive whitespace while preserving structure
        text = re.sub(r'\n{4,}', '\n\n\n', text)  # Max 3 consecutive newlines
        text = re.sub(r' {3,}', '  ', text)       # Max 2 spaces between words
        text = re.sub(r'\t+', ' ', text)          # Replace tabs with single space
        
        # Remove non-printable characters (except newlines and basic punctuation)
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
        
        # Clean excessive punctuation but preserve CV formatting
        text = re.sub(r'-{4,}', '---', text)      # Max 3 dashes
        text = re.sub(r'_{4,}', '___', text)      # Max 3 underscores
        text = re.sub(r'\.{4,}', '...', text)     # Max 3 dots
        
        # Fix common OCR/extraction errors
        text = re.sub(r'([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])', r'\1\2\3', text)  # Fix spaced letters
        text = re.sub(r'(\d)\s+(\d)', r'\1\2', text)  # Fix spaced numbers
        
        # Preserve email and phone formatting
        text = re.sub(r'(\w+)\s*@\s*(\w+)', r'\1@\2', text)  # Fix emails
        text = re.sub(r'(\+?\d+)\s+(\d+)\s+(\d+)', r'\1 \2\3', text)  # Fix phone numbers
        
        return text.strip()
    
    def _detect_sections(self, text: str) -> Dict[str, str]:
        """Detect and extract CV sections."""
        sections = {}
        
        # Common CV section patterns (multilingual)
        section_patterns = {
            'contact': r'(contact|اتصال|معلومات شخصية|personal|phone|email|address)',
            'profile': r'(profile|summary|objective|ملخص|نبذة|about)',
            'experience': r'(experience|work|employment|خبرة|عمل|وظيفة)',
            'education': r'(education|academic|qualifications|تعليم|مؤهلات|دراسة)',
            'skills': r'(skills|competencies|technologies|مهارات|قدرات|تقنيات)',
            'projects': r'(projects|portfolio|مشاريع|أعمال)',
            'languages': r'(languages|لغات)',
            'certifications': r'(certifications|certificates|licenses|شهادات|رخص)'
        }
        
        lines = text.split('\n')
        current_section = 'header'
        section_content = []
        
        for line in lines:
            line_clean = line.strip()
            line_lower = line_clean.lower()
            
            if not line_clean:
                continue

            # Check if line is a section header
            # Rule: Header must be short (< 60 chars) and match a pattern
            section_found = None
            if len(line_clean) < 60:
                for section_name, pattern in section_patterns.items():
                    # Check if line STARTS with the keyword or IS the keyword (more accurate)
                    if re.match(r'^' + pattern + r'\s*[:\-–]?\s*$', line_lower) or \
                       (len(line_clean) < 30 and re.search(pattern, line_lower)):
                        section_found = section_name
                        break
            
            if section_found:
                # Save previous section
                if current_section and section_content:
                    sections[current_section] = '\n'.join(section_content).strip()
                
                # Start new section
                current_section = section_found
                section_content = [line_clean]
            else:
                # Add to current section
                section_content.append(line_clean)
        
        # Save last section
        if current_section and section_content:
            sections[current_section] = '\n'.join(section_content).strip()
        
        return sections
    
    def get_extraction_stats(self) -> Dict[str, bool]:
        """Get availability status of extraction methods."""
        return {
            'docling_available': DOCLING_AVAILABLE and self.docling_converter is not None,
            'easyocr_available': EASYOCR_AVAILABLE and self.ocr_reader is not None,
            'pymupdf_available': True,  # Always available
            'python_docx_available': True  # Always available
        }


# Global instance
local_cv_extractor = LocalCVExtractor()