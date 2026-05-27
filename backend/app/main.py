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
import asyncio


from app.core.config import settings
from app.api.v1.router import api_router
from app.core.errors import http_exception_handler, general_exception_handler

logger.info(f"CRITICAL DEBUG: main.py sees SMTP_USER='{settings.SMTP_USER}'")


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

    # ── Database Migrations (Automatic Fix for Schema Inconsistencies) ────
    try:
        import os
        from alembic.config import Config
        from alembic import command
        from sqlalchemy import create_engine, text, inspect
        
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ini_path = os.path.join(base_dir, "alembic.ini")
        
        # 1. Run Standard Alembic Migrations
        if os.path.exists(ini_path):
            logger.info("Running alembic upgrade head...")
            alembic_cfg = Config(ini_path)
            alembic_cfg.set_main_option("script_location", os.path.join(base_dir, "alembic"))
            await asyncio.to_thread(command.upgrade, alembic_cfg, "head")
            logger.info("Alembic migrations completed")
        
        # 2. Deep Safety Check: Force-sync missing columns for complex tables
        # This fixes cases where Alembic marks a migration as done but SQLite didn't apply it
        db_path = os.path.join(base_dir, "ai_resume.db")
        engine = create_engine(f"sqlite:///{db_path}")
        
        with engine.connect() as conn:
            inspector = inspect(engine)
            
            # Helper to add column if missing
            def ensure_col(table_name, col_name, col_type_sql):
                existing_cols = [c['name'] for c in inspector.get_columns(table_name)]
                if col_name not in existing_cols:
                    logger.info(f"FIXING SCHEMA: Adding {col_name} to {table_name}")
                    try:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type_sql}"))
                        conn.commit()
                    except Exception as e:
                        logger.warning(f"Could not add {col_name} to {table_name}: {e}")

            # Tables to repair
            tables = inspector.get_table_names()
            
            # Repair XAI Reports
            if 'xai_reports' in tables:
                ensure_col('xai_reports', 'overall_explanation', 'JSON')
                ensure_col('xai_reports', 'evidence_for_match', "JSON DEFAULT '[]'")
                ensure_col('xai_reports', 'evidence_against_match', "JSON DEFAULT '[]'")
                ensure_col('xai_reports', 'key_achievements', "JSON DEFAULT '[]'")
                ensure_col('xai_reports', 'counterfactuals', "JSON DEFAULT '[]'")
                ensure_col('xai_reports', 'visual_data', 'JSON')
                ensure_col('xai_reports', 'force_plot_data', 'JSON')
                ensure_col('xai_reports', 'waterfall_data', 'JSON')
                ensure_col('xai_reports', 'summary_plot_data', 'JSON')
                ensure_col('xai_reports', 'credibility_analysis', 'JSON')
                ensure_col('xai_reports', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')

            # Repair Gap Reports
            if 'gap_reports' in tables:
                ensure_col('gap_reports', 'critical_gaps', "JSON DEFAULT '[]'")
                ensure_col('gap_reports', 'important_gaps', "JSON DEFAULT '[]'")
                ensure_col('gap_reports', 'nice_to_have_gaps', "JSON DEFAULT '[]'")
                ensure_col('gap_reports', 'learning_roadmap', "JSON DEFAULT '[]'")
                ensure_col('gap_reports', 'estimated_time_weeks', 'INTEGER')
                ensure_col('gap_reports', 'quick_wins', 'JSON')
                ensure_col('gap_reports', 'competitive_differentiator', 'JSON')
                ensure_col('gap_reports', 'total_potential_improvement', 'NUMERIC(3,2)')
                ensure_col('gap_reports', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')

            # Repair Analysis Records (Standard columns)
            if 'analysis_records' in tables:
                ensure_col('analysis_records', 'seniority_alignment', 'JSON')
                ensure_col('analysis_records', 'red_flags', 'JSON')
                ensure_col('analysis_records', 'hiring_urgency', 'VARCHAR(20)')
                ensure_col('analysis_records', 'is_partial', 'BOOLEAN DEFAULT 0')
                ensure_col('analysis_records', 'confidence_score', 'NUMERIC(3,2)')
                ensure_col('analysis_records', 'requires_human_review', 'BOOLEAN DEFAULT 0')
                ensure_col('analysis_records', 'human_review_status', 'VARCHAR(20)')
                ensure_col('analysis_records', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            
            # Repair Audit Logs
            if 'audit_logs' in tables:
                ensure_col('audit_logs', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')
            
            # Repair Skill Reports
            if 'skill_reports' in tables:
                ensure_col('skill_reports', 'job_titles', "JSON DEFAULT '[]'")
                ensure_col('skill_reports', 'companies', "JSON DEFAULT '[]'")
                ensure_col('skill_reports', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')

            # Repair CV Documents
            if 'cv_documents' in tables:
                ensure_col('cv_documents', 'deleted_at', 'DATETIME')
                ensure_col('cv_documents', 'updated_at', 'DATETIME DEFAULT CURRENT_TIMESTAMP')

            conn.commit()
            logger.info("Database Deep Safety Sync completed")
            
    except Exception as m_err:
        logger.error(f"Automatic migration/sync failed: {m_err}")

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
# NOTE: We CANNOT use allow_origins=["*"] with allow_credentials=True —
# browsers block cookies when the origin is a wildcard. Always use explicit origins.
origins = settings.cors_origins_list

# In development, if CORS_ORIGINS is default, also add common dev origins
if settings.ENVIRONMENT == "development":
    dev_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ]
    for o in dev_origins:
        if o not in origins:
            origins.append(o)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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

# ── Legacy Redirects (Fallback for non-versioned frontend calls) ─────────────────
@app.post("/auth/login")
async def legacy_login_redirect(request: Request):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/v1/auth/login", status_code=307)

@app.post("/auth/register")
async def legacy_register_redirect(request: Request):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/v1/auth/register", status_code=307)

@app.get("/auth/me")
async def legacy_me_redirect(request: Request):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url="/api/v1/auth/me", status_code=307)

@app.api_route("/users/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def legacy_users_redirect(path: str, request: Request):
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url=f"/api/v1/users/{path}", status_code=307)

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
