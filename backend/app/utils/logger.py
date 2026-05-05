"""
Loguru Logger Configuration
"""
import sys
from loguru import logger
from app.core.config import settings

# Remove default handler
logger.remove()

# Add console handler (encoding parameter removed for compatibility)
logger.add(
    sys.stderr,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    level="DEBUG" if settings.DEBUG else "INFO",
)

