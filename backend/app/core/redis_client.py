"""
Redis client for session management and caching.

This module provides:
- Redis connection management
- Session storage with TTL
- Token blacklist for logout
- Cache operations
"""
import json
from typing import Optional, Any, Dict
from datetime import timedelta

import redis.asyncio as redis
from redis.asyncio import Redis

from app.core.config import settings
from app.utils.logger import logger


class RedisClient:
    """Redis client for session and cache management."""
    
    def __init__(self):
        """Initialize Redis client."""
        self._client: Optional[Redis] = None
    
    async def connect(self) -> None:
        """Establish connection to Redis."""
        try:
            self._client = await redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
            # Test connection
            await self._client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            raise
    
    async def disconnect(self) -> None:
        """Close Redis connection."""
        if self._client:
            await self._client.close()
            logger.info("Redis connection closed")
    
    @property
    def client(self) -> Redis:
        """Get Redis client instance."""
        if not self._client:
            raise RuntimeError("Redis client not connected. Call connect() first.")
        return self._client
    
    # Session Management Methods
    
    async def create_session(
        self,
        user_id: str,
        session_data: Dict[str, Any],
        ttl_seconds: int = 1800  # 30 minutes default
    ) -> str:
        """
        Create a new session in Redis.
        
        Args:
            user_id: User ID
            session_data: Session metadata to store
            ttl_seconds: Time-to-live in seconds (default 30 minutes)
            
        Returns:
            Session key
            
        Requirements: 20.15
        """
        session_key = f"session:{user_id}"
        
        try:
            # Store session data as JSON
            await self.client.setex(
                session_key,
                ttl_seconds,
                json.dumps(session_data)
            )
            
            logger.debug(f"Session created for user {user_id} with TTL {ttl_seconds}s")
            return session_key
            
        except Exception as e:
            logger.error(f"Failed to create session: {str(e)}")
            raise
    
    async def get_session(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session data from Redis.
        
        Args:
            user_id: User ID
            
        Returns:
            Session data if exists, None otherwise
            
        Requirements: 20.15
        """
        session_key = f"session:{user_id}"
        
        try:
            data = await self.client.get(session_key)
            
            if data:
                return json.loads(data)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get session: {str(e)}")
            return None
    
    async def update_session(
        self,
        user_id: str,
        session_data: Dict[str, Any],
        ttl_seconds: int = 1800
    ) -> bool:
        """
        Update existing session data.
        
        Args:
            user_id: User ID
            session_data: Updated session metadata
            ttl_seconds: Time-to-live in seconds
            
        Returns:
            True if successful, False otherwise
            
        Requirements: 20.15
        """
        session_key = f"session:{user_id}"
        
        try:
            await self.client.setex(
                session_key,
                ttl_seconds,
                json.dumps(session_data)
            )
            return True
            
        except Exception as e:
            logger.error(f"Failed to update session: {str(e)}")
            return False
    
    async def delete_session(self, user_id: str) -> bool:
        """
        Delete session from Redis.
        
        Args:
            user_id: User ID
            
        Returns:
            True if deleted, False otherwise
            
        Requirements: 20.15
        """
        session_key = f"session:{user_id}"
        
        try:
            result = await self.client.delete(session_key)
            logger.debug(f"Session deleted for user {user_id}")
            return result > 0
            
        except Exception as e:
            logger.error(f"Failed to delete session: {str(e)}")
            return False
    
    async def extend_session(
        self,
        user_id: str,
        ttl_seconds: int = 1800
    ) -> bool:
        """
        Extend session TTL.
        
        Args:
            user_id: User ID
            ttl_seconds: New TTL in seconds
            
        Returns:
            True if successful, False otherwise
            
        Requirements: 20.15
        """
        session_key = f"session:{user_id}"
        
        try:
            result = await self.client.expire(session_key, ttl_seconds)
            return result
            
        except Exception as e:
            logger.error(f"Failed to extend session: {str(e)}")
            return False
    
    # Token Blacklist Methods
    
    async def blacklist_token(
        self,
        token: str,
        ttl_seconds: int = 86400  # 24 hours (match token expiry)
    ) -> bool:
        """
        Add token to blacklist (for logout).
        
        Args:
            token: JWT token to blacklist
            ttl_seconds: Time-to-live (should match token expiry)
            
        Returns:
            True if successful, False otherwise
            
        Requirements: 1.8
        """
        blacklist_key = f"blacklist:{token}"
        
        try:
            await self.client.setex(blacklist_key, ttl_seconds, "1")
            logger.debug("Token added to blacklist")
            return True
            
        except Exception as e:
            logger.error(f"Failed to blacklist token: {str(e)}")
            return False
    
    async def is_token_blacklisted(self, token: str) -> bool:
        """
        Check if token is blacklisted.
        
        Args:
            token: JWT token to check
            
        Returns:
            True if blacklisted, False otherwise
            
        Requirements: 1.8
        """
        blacklist_key = f"blacklist:{token}"
        
        try:
            result = await self.client.exists(blacklist_key)
            return result > 0
            
        except Exception as e:
            logger.error(f"Failed to check token blacklist: {str(e)}")
            return False
    
    # Cache Methods
    
    async def set_cache(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None
    ) -> bool:
        """
        Set cache value.
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl_seconds: Optional TTL in seconds
            
        Returns:
            True if successful, False otherwise
        """
        try:
            serialized_value = json.dumps(value)
            
            if ttl_seconds:
                await self.client.setex(key, ttl_seconds, serialized_value)
            else:
                await self.client.set(key, serialized_value)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set cache: {str(e)}")
            return False
    
    async def get_cache(self, key: str) -> Optional[Any]:
        """
        Get cache value.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value if exists, None otherwise
        """
        try:
            value = await self.client.get(key)
            
            if value:
                return json.loads(value)
            return None
            
        except Exception as e:
            logger.error(f"Failed to get cache: {str(e)}")
            return None
    
    async def delete_cache(self, key: str) -> bool:
        """
        Delete cache value.
        
        Args:
            key: Cache key
            
        Returns:
            True if deleted, False otherwise
        """
        try:
            result = await self.client.delete(key)
            return result > 0
            
        except Exception as e:
            logger.error(f"Failed to delete cache: {str(e)}")
            return False
    
    async def invalidate_pattern(self, pattern: str) -> int:
        """
        Invalidate all cache keys matching pattern.
        
        Args:
            pattern: Redis key pattern (e.g., "user:*")
            
        Returns:
            Number of keys deleted
        """
        try:
            keys = []
            async for key in self.client.scan_iter(match=pattern):
                keys.append(key)
            
            if keys:
                return await self.client.delete(*keys)
            return 0
            
        except Exception as e:
            logger.error(f"Failed to invalidate cache pattern: {str(e)}")
            return 0


# Global Redis client instance
redis_client = RedisClient()


async def get_redis() -> RedisClient:
    """Dependency to get Redis client."""
    return redis_client
