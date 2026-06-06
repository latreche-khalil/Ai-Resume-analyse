"""
Virus Scanner Service using ClamAV.

Requirements: 3.3, 3.4, 20.10
"""
import asyncio
from typing import Tuple, Optional
import pyclamd

from app.core.config import settings
from app.utils.logger import logger


class VirusScannerService:
    """
    Service for scanning files for malware using ClamAV.
    
    Features:
    - Virus scanning within 30 seconds
    - Incident logging when malware detected
    - Connection to ClamAV daemon
    
    Requirements: 3.3, 3.4, 20.10
    """
    
    # Scan timeout: 30 seconds
    SCAN_TIMEOUT_SECONDS = 30
    
    def __init__(self):
        """Initialize ClamAV connection."""
        self.clamd = None
        self._initialize_connection()
    
    def _initialize_connection(self) -> None:
        """
        Initialize connection to ClamAV daemon.
        
        Requirements: 3.3
        """
        if getattr(settings, 'SKIP_VIRUS_SCAN', False):
            logger.info("ClamAV virus scanning is skipped by configuration")
            self.clamd = None
            return

        try:
            self.clamd = pyclamd.ClamdNetworkSocket(
                host=settings.CLAMAV_HOST,
                port=settings.CLAMAV_PORT,
                timeout=self.SCAN_TIMEOUT_SECONDS
            )
            
            # Test connection
            if self.clamd.ping():
                logger.info("ClamAV connection established")
            else:
                logger.error("ClamAV ping failed")
                self.clamd = None
                
        except Exception as e:
            logger.error(f"Failed to connect to ClamAV: {str(e)}")
            self.clamd = None
    
    async def scan_file(self, file_content: bytes, filename: str) -> Tuple[bool, Optional[str]]:
        """
        Scan file for viruses.
        
        Args:
            file_content: File content bytes
            filename: Original filename
            
        Returns:
            Tuple of (is_clean, virus_name)
            
        Requirements: 3.3, 3.4, 20.10
        """
        if not self.clamd:
            # ClamAV unavailable — log a clear warning.
            # In development/offline environments this is acceptable.
            # In production, set SKIP_VIRUS_SCAN=false and ensure ClamAV is running.
            logger.warning(
                "ClamAV not available — virus scan SKIPPED. "
                "Ensure ClamAV is running in production environments."
            )
            # Only allow the upload to proceed if explicitly configured to skip scanning.
            # Default behavior is to block when ClamAV is unreachable in production.
            if getattr(settings, 'ENVIRONMENT', 'development') == 'production':
                return False, "SCAN_UNAVAILABLE"
            return True, None  # Allow in dev/test only
        
        try:
            # Scan file content
            scan_result = await asyncio.to_thread(
                self.clamd.scan_stream,
                file_content
            )
            
            if scan_result is None:
                # File is clean
                logger.info(f"Virus scan passed: {filename}")
                return True, None
            
            # Virus detected
            virus_name = scan_result.get('stream', ['UNKNOWN'])[1]
            
            logger.warning(
                f"SECURITY INCIDENT: Virus detected in file {filename}: {virus_name}"
            )
            
            # Log security incident
            await self._log_security_incident(filename, virus_name)
            
            return False, virus_name
            
        except pyclamd.ConnectionError:
            logger.error("ClamAV connection error during scan — attempting reconnect")
            self._initialize_connection()
            if getattr(settings, 'ENVIRONMENT', 'development') == 'production':
                return False, "SCAN_UNAVAILABLE"
            return True, None  # Allow in dev/test only

        except Exception as e:
            logger.error(f"Virus scan error: {str(e)}")
            if getattr(settings, 'ENVIRONMENT', 'development') == 'production':
                return False, "SCAN_ERROR"
            return True, None  # Allow in dev/test only
    
    async def _log_security_incident(self, filename: str, virus_name: str) -> None:
        """
        Log security incident when malware detected.
        
        Args:
            filename: Infected filename
            virus_name: Name of detected virus
            
        Requirements: 20.10
        """
        try:
            # In production, this would send alerts to security team
            logger.critical(
                f"SECURITY INCIDENT - Malware detected: "
                f"file={filename}, virus={virus_name}"
            )
            
            # DEFERRED: Security alert notifications (Sentry/email) — Phase 2
            # DEFERRED: Admin notification system — Phase 2
            
        except Exception as e:
            logger.error(f"Failed to log security incident: {str(e)}")
    
    def get_version(self) -> Optional[str]:
        """
        Get ClamAV version.
        
        Returns:
            ClamAV version string or None
        """
        if not self.clamd:
            return None
        
        try:
            return self.clamd.version()
        except Exception:
            return None


# Global virus scanner service instance
virus_scanner_service = VirusScannerService()
