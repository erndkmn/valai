/**
 * Rate limiting service using sliding window algorithm.
 *
 * Implements 10 requests per minute per user using:
 * - Redis (preferred for production, multi-instance deployments)
 * - In-memory fallback (single-instance only, resets on restart)
 */

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 10; // Max requests
const RATE_LIMIT_WINDOW_SECONDS = 60; // Per minute

// Redis connection settings
const REDIS_URL = process.env.REDIS_URL || null;

// Global Redis client (lazy initialized)
let redisClient = null;
let redisAvailable = null;

/**
 * Lazy-initialize Redis client. Returns null if Redis unavailable.
 */
async function getRedisClient() {
  if (redisAvailable === false) {
    return null;
  }

  if (redisClient !== null) {
    return redisClient;
  }

  if (!REDIS_URL) {
    redisAvailable = false;
    console.log('REDIS_URL not configured, using in-memory rate limiting');
    return null;
  }

  try {
    const Redis = require('ioredis');
    redisClient = new Redis(REDIS_URL);
    await redisClient.ping();
    redisAvailable = true;
    console.log('Redis rate limiting initialized');
    return redisClient;
  } catch (error) {
    redisAvailable = false;
    console.warn(`Redis unavailable, falling back to in-memory: ${error.message}`);
    return null;
  }
}

/**
 * In-memory rate limiter using sliding window.
 * WARNING: Only suitable for single-instance deployments.
 */
class InMemoryRateLimiter {
  constructor() {
    this.requests = new Map(); // userId -> array of timestamps
  }

  /**
   * Check if user is within rate limit.
   * @param {number} userId - User ID
   * @returns {[boolean, number, number]} Tuple of (allowed, remaining, resetInSeconds)
   */
  checkRateLimit(userId) {
    const now = Date.now() / 1000;
    const windowStart = now - RATE_LIMIT_WINDOW_SECONDS;

    // Get user's requests
    let userRequests = this.requests.get(userId) || [];

    // Remove expired timestamps
    userRequests = userRequests.filter(ts => ts > windowStart);

    const currentCount = userRequests.length;
    const remaining = Math.max(0, RATE_LIMIT_REQUESTS - currentCount);

    if (currentCount >= RATE_LIMIT_REQUESTS) {
      // Calculate when oldest request will expire
      const oldest = userRequests.length > 0 ? Math.min(...userRequests) : now;
      const resetIn = Math.ceil(oldest + RATE_LIMIT_WINDOW_SECONDS - now) + 1;
      this.requests.set(userId, userRequests);
      return [false, 0, resetIn];
    }

    // Record this request
    userRequests.push(now);
    this.requests.set(userId, userRequests);
    return [true, remaining - 1, RATE_LIMIT_WINDOW_SECONDS];
  }
}

// Singleton in-memory rate limiter
const inMemoryLimiter = new InMemoryRateLimiter();

/**
 * Redis-based rate limiter using sorted sets for sliding window.
 */
class RedisRateLimiter {
  constructor(client) {
    this.client = client;
  }

  /**
   * Check if user is within rate limit using Redis.
   * @param {number} userId - User ID
   * @returns {Promise<[boolean, number, number]>} Tuple of (allowed, remaining, resetInSeconds)
   */
  async checkRateLimit(userId) {
    const key = `rate_limit:${userId}`;
    const now = Date.now() / 1000;
    const windowStart = now - RATE_LIMIT_WINDOW_SECONDS;

    // Execute atomically using multi
    const multi = this.client.multi();
    
    // Remove old entries outside the window
    multi.zremrangebyscore(key, '-inf', windowStart);
    // Count current requests in window
    multi.zcard(key);
    // Get oldest timestamp
    multi.zrange(key, 0, 0, 'WITHSCORES');

    const results = await multi.exec();
    const currentCount = results[1][1];

    if (currentCount >= RATE_LIMIT_REQUESTS) {
      const oldestData = results[2][1];
      let resetAt = RATE_LIMIT_WINDOW_SECONDS;
      if (oldestData && oldestData.length >= 2) {
        resetAt = Math.ceil(parseFloat(oldestData[1]) + RATE_LIMIT_WINDOW_SECONDS - now);
      }
      return [false, 0, Math.max(1, resetAt)];
    }

    // Add current request
    const uniqueKey = `${now}-${Math.random()}`;
    await this.client.zadd(key, now, uniqueKey);
    await this.client.expire(key, RATE_LIMIT_WINDOW_SECONDS + 10);

    const remaining = RATE_LIMIT_REQUESTS - currentCount - 1;
    return [true, remaining, RATE_LIMIT_WINDOW_SECONDS];
  }
}

/**
 * Check if a user is within their rate limit.
 * @param {number} userId - User ID
 * @returns {Promise<[boolean, number, number]>} Tuple of (allowed, remaining, resetInSeconds)
 */
async function checkRateLimit(userId) {
  const redis = await getRedisClient();
  
  if (redis) {
    const limiter = new RedisRateLimiter(redis);
    return limiter.checkRateLimit(userId);
  }
  
  return inMemoryLimiter.checkRateLimit(userId);
}

/**
 * Get rate limit headers for HTTP response.
 * @param {number} remaining - Remaining requests
 * @param {number} resetIn - Seconds until reset
 * @returns {object} Headers object
 */
function getRateLimitHeaders(remaining, resetIn) {
  return {
    'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
    'X-RateLimit-Remaining': Math.max(0, remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 + resetIn).toString(),
  };
}

module.exports = {
  RATE_LIMIT_REQUESTS,
  RATE_LIMIT_WINDOW_SECONDS,
  checkRateLimit,
  getRateLimitHeaders,
};
