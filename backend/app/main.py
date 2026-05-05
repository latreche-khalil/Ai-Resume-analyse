from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
import sentry_sdk
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.errors import http_exception_handler, general_exception_handler


# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=1.0)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    from app.core.redis_client import redis_client

    logger.info("AI Resume Analyzer Backend Started")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    logger.info("Privacy Gateway: Enabled")

    try:
        await redis_client.connect()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis unavailable (non-fatal): {e}")

    # ── Background Service Warm-up ──────────────────────────────────────────
    # Proactively load heavy ML models into memory to avoid first-request timeout
    async def warmup_services():
        try:
            logger.info("Service Warm-up: Starting in background...")
            
            # 1. Warm up PII Detector (Presidio / Spacy)
            from app.services.privacy.pii_detector import pii_detector
            await asyncio.to_thread(pii_detector._get_engine)
            logger.info("Service Warm-up: PII Detector ready")
            
            # 2. Warm up CV Extractor (Docling / EasyOCR)
            from app.services.extraction.local_cv_extractor import local_cv_extractor
            await asyncio.to_thread(local_cv_extractor._initialize_docling)
            await asyncio.to_thread(local_cv_extractor._initialize_easyocr)
            logger.info("Service Warm-up: LocalCVExtractor ready")

            # 3. Warm up LocalNLP Extractor (GLiNER)
            from app.services.nlp.local_nlp_extractor import local_nlp_extractor
            await asyncio.to_thread(local_nlp_extractor._ensure_loaded)
            logger.info("Service Warm-up: LocalNLPExtractor ready")
            
            logger.info("Service Warm-up: All heavy services pre-loaded")
        except Exception as warmup_err:
            logger.error(f"Service Warm-up failed: {warmup_err}")

    # Start warm-up without blocking startup
    import asyncio
    asyncio.create_task(warmup_services())

    yield

    logger.info("AI Resume Analyzer Backend Shutting Down")
    try:
        await redis_client.disconnect()
    except Exception as e:
        logger.error(f"Failed to close Redis connection: {e}")


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Resume Analyzer & Career Mentor API",
    description="Privacy-by-Design AI-powered resume analysis platform",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ── Rate Limiting (SlowAPI) ────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ───────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Set-Cookie"],
)

# ── Global exception handlers ──────────────────────────────────────────────────
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)

# ── Request-ID middleware ──────────────────────────────────────────────────────
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    from uuid import uuid4
    request.state.request_id = str(uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response

# ── Rate-limit middleware (per-route tiers) ────────────────────────────────────
@app.middleware("http")
async def rate_limit_by_route(request: Request, call_next):
    """
    Tiered rate limiting without decorating every endpoint.

    Tiers (per IP per minute):
      - /auth/*          → 20  req/min  (brute-force protection)
      - /documents/upload → 10  req/min  (heavy processing)
      - /analysis/match  → 30  req/min  (LLM calls)
      - everything else  → 200 req/min  (default)
    """
    from app.core.redis_client import redis_client
    import time

    path = request.url.path

    # Determine tier
    if "/auth/" in path:
        limit, window = 20, 60
    elif "/documents/upload" in path:
        limit, window = 10, 60
    elif "/analysis/match" in path:
        limit, window = 30, 60
    else:
        return await call_next(request)   # default handled by SlowAPI

    ip = request.client.host if request.client else "unknown"
    key = f"rl:{path.split('/')[3] if path.count('/') >= 3 else 'api'}:{ip}"

    try:
        client = redis_client._client
        if client:
            current = await client.incr(key)
            if current == 1:
                await client.expire(key, window)
            if current > limit:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error_code": "RATE_LIMIT_EXCEEDED",
                        "message": f"Too many requests. Limit: {limit}/min.",
                        "retry_after": window,
                    },
                    headers={"Retry-After": str(window)},
                )
    except Exception:
        pass   # Redis unavailable — fail open (don't block requests)

    return await call_next(request)

# ── Prometheus ─────────────────────────────────────────────────────────────────
Instrumentator().instrument(app).expose(app)

# ── Router ─────────────────────────────────────────────────────────────────────
app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy", "service": "ai-resume-backend"}


# ── Circuit breaker status endpoint (admin) ────────────────────────────────────
@app.get("/api/v1/admin/circuit-breakers", tags=["Admin"])
async def circuit_breaker_status():
    """View circuit breaker states for all external services."""
    from app.core.circuit_breaker import puter_ai_breaker, redis_breaker, chromadb_breaker
    return {
        "circuit_breakers": [
            puter_ai_breaker.status(),
            redis_breaker.status(),
            chromadb_breaker.status(),
        ]
    }
