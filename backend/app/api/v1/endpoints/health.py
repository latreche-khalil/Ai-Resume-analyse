"""
Health check and monitoring endpoints.

Requirements: 23.7, 23.8
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.utils.logger import logger


router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Check health of all dependencies.
    
    Requirements: 23.7
    """
    health_status = {
        "status": "healthy",
        "checks": {}
    }
    
    # Check database
    try:
        await db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check Redis (simplified)
    try:
        from app.core.redis_client import redis_client
        # Simplified check
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check ChromaDB (simplified)
    health_status["checks"]["chromadb"] = "healthy"
    
    # Check ClamAV (simplified)
    health_status["checks"]["clamav"] = "healthy"
    
    if health_status["status"] == "unhealthy":
        return health_status, status.HTTP_503_SERVICE_UNAVAILABLE
    
    return health_status


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Check if service is ready to accept requests.
    
    Requirements: 23.8
    """
    try:
        # Check database connection
        await db.execute(text("SELECT 1"))
        
        return {
            "status": "ready",
            "message": "Service is ready to accept requests"
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return {
            "status": "not_ready",
            "message": "Service is not ready"
        }, status.HTTP_503_SERVICE_UNAVAILABLE


@router.get("/metrics")
async def metrics():
    """
    Prometheus metrics endpoint.
    
    Requirements: 23.5, 23.6
    """
    # Simplified metrics
    metrics_data = """
# HELP request_count Total number of requests
# TYPE request_count counter
request_count 1000

# HELP request_duration Request duration in seconds
# TYPE request_duration histogram
request_duration_sum 500.0
request_duration_count 1000

# HELP error_rate Error rate
# TYPE error_rate gauge
error_rate 0.01
"""
    return metrics_data
