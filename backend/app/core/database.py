"""
Async database engine and session factory.

Supports both PostgreSQL (production) and SQLite (local development).
Session dependency properly handles commit/rollback lifecycle.
"""
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from app.core.config import settings


def _build_database_url(url: str) -> str:
    """
    Normalise the DATABASE_URL for async drivers.

    - sqlite:///  →  sqlite+aiosqlite:///
    - postgresql://  →  postgresql+asyncpg://   (if bare dialect used)
    """
    if url.startswith("sqlite:///") and "aiosqlite" not in url:
        return url.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    if url.startswith("postgresql://") and "asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


_DATABASE_URL = _build_database_url(settings.DATABASE_URL)

# ──────────────────────────────────────────────────────────────────────────────
# Engine — tune pool settings for PostgreSQL; SQLite doesn't use a pool
# Production-ready settings for high-load scenarios
# ──────────────────────────────────────────────────────────────────────────────
_is_sqlite = _DATABASE_URL.startswith("sqlite")

# Production pool settings based on expected load
# Formula: pool_size = (num_workers * 2) + spare_connections
# For 4 workers: (4 * 2) + 5 = 13, rounded to 15
PRODUCTION_POOL_SIZE = 15
PRODUCTION_MAX_OVERFLOW = 30  # Allow burst traffic
PRODUCTION_POOL_TIMEOUT = 30  # Seconds to wait for connection

engine = create_async_engine(
    _DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    # SQLite doesn't support connection pooling the same way
    **({} if _is_sqlite else {
        "pool_size": PRODUCTION_POOL_SIZE,
        "max_overflow": PRODUCTION_MAX_OVERFLOW,
        "pool_timeout": PRODUCTION_POOL_TIMEOUT,
        "pool_pre_ping": True,         # detect stale connections
        "pool_recycle": 3600,          # recycle connections every hour
        "pool_use_lifo": True,         # LIFO for better connection reuse
    }),
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db():
    """
    FastAPI dependency that provides a database session.

    Endpoints are responsible for calling db.commit() explicitly.
    This dependency only handles rollback on error and cleanup.

    Guarantees:
    - Automatic rollback on unhandled exceptions
    - Session is always closed after the request (via async-with)
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()      # rollback on any error
            raise
