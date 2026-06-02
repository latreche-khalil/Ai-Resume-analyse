"""
Simple in-memory TTL cache for read-heavy endpoints.
Reduces repeated DB queries when multiple frontend components
request the same data within a short window.
"""
import time
from typing import Any, Optional, Dict, Tuple
from threading import Lock


class SimpleCache:
    """Thread-safe in-memory cache with TTL."""

    def __init__(self):
        self._store: Dict[str, Tuple[Any, float]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: Any, ttl: int = 10) -> None:
        with self._lock:
            self._store[key] = (value, time.monotonic() + ttl)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def delete_prefix(self, prefix: str) -> None:
        """Invalidate all keys starting with prefix."""
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


# Global singleton
simple_cache = SimpleCache()
