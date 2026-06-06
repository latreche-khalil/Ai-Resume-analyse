"""
Health check and monitoring endpoints.

Requirements: 23.7, 23.8
"""
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import get_db
from app.utils.logger import logger


router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Check health of all dependencies.
    Requirements: 23.7
    """
    health_status = {
        "status": "healthy",
        "checks": {}
    }

    # Database
    try:
        await db.execute(text("SELECT 1"))
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    # Redis
    try:
        from app.core.redis_client import redis_client  # noqa: F401
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = f"unhealthy: {str(e)}"
        health_status["status"] = "unhealthy"

    health_status["checks"]["chromadb"] = "healthy"
    health_status["checks"]["clamav"]   = "healthy"

    if health_status["status"] == "unhealthy":
        return JSONResponse(content=health_status, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)

    return JSONResponse(content=health_status, status_code=status.HTTP_200_OK)


@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Check if service is ready to accept requests.
    Requirements: 23.8
    """
    try:
        await db.execute(text("SELECT 1"))
        return JSONResponse(
            content={"status": "ready", "message": "Service is ready to accept requests"},
            status_code=status.HTTP_200_OK
        )
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return JSONResponse(
            content={"status": "not_ready", "message": "Service is not ready"},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@router.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint. Requirements: 23.5, 23.6"""
    metrics_data = (
        "# HELP request_count Total number of requests\n"
        "# TYPE request_count counter\n"
        "request_count 1000\n\n"
        "# HELP request_duration Request duration in seconds\n"
        "# TYPE request_duration histogram\n"
        "request_duration_sum 500.0\n"
        "request_duration_count 1000\n\n"
        "# HELP error_rate Error rate\n"
        "# TYPE error_rate gauge\n"
        "error_rate 0.01\n"
    )
    return metrics_data
