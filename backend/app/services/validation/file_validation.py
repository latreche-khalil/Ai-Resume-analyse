"""
File Validation Service.

Validates file format and size before processing.

Requirements: 3.1, 3.2
"""
# import magic  # Disabled temporarily - requires libmagic
from typing import Tuple, Optional

from app.core.config import settings
from app.utils.logger import logger


class FileValidationService:
    """
    Service for validating uploaded files.
    
    Features:
    - File size validation (10MB max)
    - File format validation using magic bytes
    - Supported formats: PDF, DOCX, JPG, PNG
    
    Requirements: 3.1, 3.2
    """
    
    # Maximum file size: 10MB
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Supported MIME types
    SUPPORTED_MIME_TYPES = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'image/jpeg': 'jpg',
        'image/png': 'png'
    }
    
    # Magic bytes signatures
    MAGIC_SIGNATURES = {
        'pdf': b'%PDF',
        'docx': b'PK\x03\x04',  # ZIP format (DOCX is a ZIP archive)
        'jpg': b'\xff\xd8\xff',
        'png': b'\x89PNG\r\n\x1a\n'
    }
    
    def validate_size(self, file_size: int) -> Tuple[bool, Optional[str]]:
        """
        Validate file size.
        
        Args:
            file_size: File size in bytes
            
        Returns:
            Tuple of (is_valid, error_message)
            
        Requirements: 3.2
        """
        if file_size > self.MAX_FILE_SIZE:
            size_mb = file_size / (1024 * 1024)
            max_mb = self.MAX_FILE_SIZE / (1024 * 1024)
            return False, f"File size ({size_mb:.2f}MB) exceeds maximum allowed size ({max_mb}MB)"
        
        if file_size == 0:
            return False, "File is empty"
        
        return True, None
    
    def validate_format(self, file_content: bytes, filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate file format using magic bytes.
        
        Args:
            file_content: File content bytes
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, error_message, detected_format)
            
        Requirements: 3.1, 3.2
        """
        try:
            # Check magic bytes
            detected_format = self._detect_format_by_magic(file_content)
            
            if not detected_format:
                return False, "Unsupported file format", None
            
            # Verify extension matches detected format
            file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
            
            if file_extension == 'jpeg':
                file_extension = 'jpg'
            
            if detected_format != file_extension:
                logger.warning(
                    f"File extension mismatch: {file_extension} vs detected {detected_format}"
                )
            
            return True, None, detected_format
            
        except Exception as e:
            logger.error(f"File format validation error: {str(e)}")
            return False, "Failed to validate file format", None
    
    def _detect_format_by_magic(self, file_content: bytes) -> Optional[str]:
        """
        Detect file format by magic bytes.
        
        Args:
            file_content: File content bytes
            
        Returns:
            Detected format or None
        """
        # Check PDF
        if file_content.startswith(self.MAGIC_SIGNATURES['pdf']):
            return 'pdf'
        
        # Check PNG
        if file_content.startswith(self.MAGIC_SIGNATURES['png']):
            return 'png'
        
        # Check JPEG
        if file_content.startswith(self.MAGIC_SIGNATURES['jpg']):
            return 'jpg'
        
        # Check DOCX (ZIP format)
        if file_content.startswith(self.MAGIC_SIGNATURES['docx']):
            # Additional check for DOCX: look for word/ directory in ZIP
            if b'word/' in file_content[:1000]:
                return 'docx'
        
        return None
    
    def validate(self, file_content: bytes, filename: str) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Validate file size and format.
        
        Args:
            file_content: File content bytes
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, error_message, detected_format)
            
        Requirements: 3.1, 3.2
        """
        # Validate size
        is_valid_size, size_error = self.validate_size(len(file_content))
        if not is_valid_size:
            return False, size_error, None
        
        # Validate format
        is_valid_format, format_error, detected_format = self.validate_format(
            file_content,
            filename
        )
        if not is_valid_format:
            return False, format_error, None
        
        logger.info(
            f"File validation passed: {filename} "
            f"({len(file_content) / 1024:.2f}KB, format: {detected_format})"
        )
        
        return True, None, detected_format


# Global file validation service instance
file_validation_service = FileValidationService()
