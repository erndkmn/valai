"""
Rate limiting service using sliding window algorithm.

Implements 10 requests per minute per user using:
- Redis (preferred for production, multi-instance deployments)
- In-memory fallback (single-instance only, resets on restart)

Design decisions:
- Sliding window provides smoother rate limiting than fixed windows
- Redis atomic operations prevent race conditions
- In-memory uses threading locks for thread safety
- Rate limit state is ephemeral (not persisted to DB) - acceptable for rate limits
"""
import time
import os
from typing import Tuple, Optional
from collections import defaultdict
import threading
import logging

logger = logging.getLogger(__name__)

# Rate limit configuration
RATE_LIMIT_REQUESTS = 10  # Max requests
RATE_LIMIT_WINDOW_SECONDS = 60  # Per minute

# Redis connection settings
REDIS_URL = os.getenv("REDIS_URL", None)

# Global Redis client (lazy initialized)
_redis_client = None
_redis_available = None


def _get_redis_client():
    """
    Lazy-initialize Redis client. Returns None if Redis unavailable.
    Caches the result to avoid repeated connection attempts.
    """
    global _redis_client, _redis_available
    
    if _redis_available is False:
        return None
    
    if _redis_client is not None:
        return _redis_client
    
    if not REDIS_URL:
        _redis_available = False
        logger.info("REDIS_URL not configured, using in-memory rate limiting")
        return None
    
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()  # Test connection
        _redis_available = True
        logger.info("Redis rate limiting initialized")
        return _redis_client
    except Exception as e:
        _redis_available = False
        logger.warning(f"Redis unavailable, falling back to in-memory: {e}")
        return None


class InMemoryRateLimiter:
    """
    Thread-safe in-memory rate limiter using sliding window.
    
    WARNING: Only suitable for single-instance deployments.
    State is lost on restart and not shared between instances.
    """
    
    def __init__(self):
        # Dict of user_id -> list of request timestamps
        self._requests: dict[int, list[float]] = defaultdict(list)
        self._lock = threading.Lock()
    
    def check_rate_limit(self, user_id: int) -> Tuple[bool, int, int]:
        """
        Check if user is within rate limit.
        
        Returns:
            Tuple of (allowed: bool, remaining: int, reset_in_seconds: int)
        """
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW_SECONDS
        
        with self._lock:
            # Remove expired timestamps (outside current window)
            self._requests[user_id] = [
                ts for ts in self._requests[user_id] 
                if ts > window_start
            ]
            
            current_count = len(self._requests[user_id])
            remaining = max(0, RATE_LIMIT_REQUESTS - current_count)
            
            if current_count >= RATE_LIMIT_REQUESTS:
                # Calculate when oldest request will expire
                oldest = min(self._requests[user_id]) if self._requests[user_id] else now
                reset_in = int(oldest + RATE_LIMIT_WINDOW_SECONDS - now) + 1
                return False, 0, reset_in
            
            # Record this request
            self._requests[user_id].append(now)
            return True, remaining - 1, RATE_LIMIT_WINDOW_SECONDS


class RedisRateLimiter:
    """
    Redis-based rate limiter using sorted sets for sliding window.
    
    Uses atomic Lua script to prevent race conditions.
    Suitable for multi-instance production deployments.
    """
    
    # Lua script for atomic rate limit check and increment
    # This runs atomically on Redis, preventing race conditions
    RATE_LIMIT_SCRIPT = """
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local window_start = now - window
    
    -- Remove old entries outside the window
    redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
    
    -- Count current requests in window
    local current = redis.call('ZCARD', key)
    
    if current >= limit then
        -- Get oldest timestamp to calculate reset time
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local reset_at = 0
        if oldest[2] then
            reset_at = oldest[2] + window - now
        end
        return {0, 0, math.ceil(reset_at)}
    end
    
    -- Add current request
    redis.call('ZADD', key, now, now .. '-' .. math.random())
    
    -- Set TTL slightly longer than window to auto-cleanup
    redis.call('EXPIRE', key, window + 10)
    
    local remaining = limit - current - 1
    return {1, remaining, window}
    """
    
    def __init__(self, redis_client):
        self._redis = redis_client
        self._script = self._redis.register_script(self.RATE_LIMIT_SCRIPT)
    
    def check_rate_limit(self, user_id: int) -> Tuple[bool, int, int]:
        """
        Check if user is within rate limit using Redis.
        
        Returns:
            Tuple of (allowed: bool, remaining: int, reset_in_seconds: int)
        """
        key = f"rate_limit:chat:{user_id}"
        now = time.time()
        
        try:
            result = self._script(
                keys=[key],
                args=[now, RATE_LIMIT_WINDOW_SECONDS, RATE_LIMIT_REQUESTS]
            )
            allowed, remaining, reset_in = result
            return bool(allowed), int(remaining), int(reset_in)
        except Exception as e:
            logger.error(f"Redis rate limit error: {e}")
            # Fail open on Redis errors - rely on quota limits as backup
            return True, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW_SECONDS


# Singleton instances
_in_memory_limiter = InMemoryRateLimiter()
_redis_limiter: Optional[RedisRateLimiter] = None


def check_rate_limit(user_id: int) -> Tuple[bool, int, int]:
    """
    Check if user is within rate limit.
    
    Automatically uses Redis if available, falls back to in-memory.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Tuple of (allowed: bool, remaining: int, reset_in_seconds: int)
    """
    global _redis_limiter
    
    redis_client = _get_redis_client()
    
    if redis_client:
        if _redis_limiter is None:
            _redis_limiter = RedisRateLimiter(redis_client)
        return _redis_limiter.check_rate_limit(user_id)
    
    return _in_memory_limiter.check_rate_limit(user_id)


def get_rate_limit_headers(remaining: int, reset_in: int) -> dict:
    """
    Generate standard rate limit headers for HTTP response.
    """
    return {
        "X-RateLimit-Limit": str(RATE_LIMIT_REQUESTS),
        "X-RateLimit-Remaining": str(remaining),
        "X-RateLimit-Reset": str(int(time.time()) + reset_in),
    }
