"""
Circuit Breaker for external API calls — async-native implementation.

Protects Puter AI, Redis, and other external services from cascade failures.
States: CLOSED → OPEN (after N failures) → HALF_OPEN (after timeout) → CLOSED

Requirements: 25.4
"""
import asyncio
import time
from enum import Enum
from typing import Callable, Any, Optional
from functools import wraps

from app.utils.logger import logger


class CircuitState(Enum):
    CLOSED    = "closed"     # Normal — requests pass through
    OPEN      = "open"       # Failing — requests rejected immediately
    HALF_OPEN = "half_open"  # Probing — one request allowed to test recovery


class CircuitBreaker:
    """
    Async-native circuit breaker.

    Usage:
        breaker = CircuitBreaker(name="puter_ai", failure_threshold=5, timeout=60)

        result = await breaker.call(some_async_func, arg1, kwarg=val)
    """

    def __init__(
        self,
        name: str = "default",
        failure_threshold: int = 5,
        timeout: int = 60,
        success_threshold: int = 2,   # successes needed in HALF_OPEN to close
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.success_threshold = success_threshold

        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._lock = asyncio.Lock()

    @property
    def state(self) -> CircuitState:
        return self._state

    @property
    def is_open(self) -> bool:
        return self._state == CircuitState.OPEN

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute func with circuit breaker protection."""
        async with self._lock:
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitState.HALF_OPEN
                    self._success_count = 0
                    logger.info(f"Circuit '{self.name}': OPEN → HALF_OPEN")
                else:
                    remaining = self.timeout - (time.time() - self._last_failure_time)
                    raise RuntimeError(
                        f"Circuit '{self.name}' is OPEN. "
                        f"Retry in {remaining:.0f}s."
                    )

        # Execute outside lock so other coroutines aren't blocked
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = await asyncio.to_thread(func, *args, **kwargs)
            await self._on_success()
            return result
        except Exception as exc:
            await self._on_failure(exc)
            raise

    def _should_attempt_reset(self) -> bool:
        if self._last_failure_time is None:
            return True
        return (time.time() - self._last_failure_time) >= self.timeout

    async def _on_success(self) -> None:
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.success_threshold:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
                    logger.info(f"Circuit '{self.name}': HALF_OPEN → CLOSED")
            else:
                self._failure_count = 0

    async def _on_failure(self, exc: Exception) -> None:
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            logger.warning(
                f"Circuit '{self.name}': failure {self._failure_count}/{self.failure_threshold} — {exc}"
            )
            if self._failure_count >= self.failure_threshold:
                self._state = CircuitState.OPEN
                logger.error(
                    f"Circuit '{self.name}': CLOSED → OPEN after {self._failure_count} failures"
                )

    def reset(self) -> None:
        """Manually reset circuit to CLOSED (for testing / admin)."""
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        logger.info(f"Circuit '{self.name}': manually reset to CLOSED")

    def status(self) -> dict:
        return {
            "name": self.name,
            "state": self._state.value,
            "failure_count": self._failure_count,
            "last_failure_time": self._last_failure_time,
        }


# ── Pre-built breakers for each external service ──────────────────────────────

puter_ai_breaker   = CircuitBreaker(name="puter_ai",   failure_threshold=5, timeout=60)
redis_breaker      = CircuitBreaker(name="redis",       failure_threshold=3, timeout=30)
chromadb_breaker   = CircuitBreaker(name="chromadb",    failure_threshold=3, timeout=30)


# ── Decorator ─────────────────────────────────────────────────────────────────

def with_circuit_breaker(breaker: CircuitBreaker):
    """
    Decorator that wraps an async function with a circuit breaker.

    Usage:
        @with_circuit_breaker(puter_ai_breaker)
        async def call_puter(...):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await breaker.call(func, *args, **kwargs)
        return wrapper
    return decorator
