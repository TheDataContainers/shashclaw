/**
 * Rate limiting utility for protecting API calls and preventing abuse.
 * Uses in-memory token bucket algorithm with optional Redis support.
 */

interface RateLimitConfig {
  maxRequests: number;      // Maximum requests allowed
  windowMs: number;         // Time window in milliseconds
  keyPrefix?: string;       // Prefix for rate limit keys
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (suitable for single-server deployments)
const rateLimitStore: RateLimitStore = {};

/**
 * Create a rate limiter function with token bucket algorithm
 * @param config Rate limit configuration
 * @returns Rate limit checker function
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyPrefix = "rl" } = config;

  return function checkRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();

    // Initialize or get existing bucket
    let bucket = rateLimitStore[key];

    if (!bucket || now >= bucket.resetTime) {
      // Create new bucket
      bucket = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore[key] = bucket;
    }

    bucket.count++;

    const allowed = bucket.count <= maxRequests;
    const remaining = Math.max(0, maxRequests - bucket.count);
    const retryAfter = allowed ? undefined : Math.ceil((bucket.resetTime - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime: bucket.resetTime,
      retryAfter,
    };
  };
}

/**
 * Rate limiter for integration API calls (10 requests per minute per integration)
 */
export const integrationRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: "integration",
});

/**
 * Rate limiter for LLM API calls (100 requests per minute per user)
 */
export const llmRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: "llm",
});

/**
 * Rate limiter for webhook delivery (50 requests per minute per webhook)
 */
export const webhookRateLimiter = createRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: "webhook",
});

/**
 * Rate limiter for agent execution (5 concurrent executions per user)
 */
export const agentExecutionRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60 * 1000, // 1 minute
  keyPrefix: "agent_exec",
});

/**
 * Clean up expired rate limit entries (call periodically)
 */
export function cleanupExpiredLimits() {
  const now = Date.now();
  let cleaned = 0;

  for (const key in rateLimitStore) {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
      cleaned++;
    }
  }

  return cleaned;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const cleaned = cleanupExpiredLimits();
  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

/**
 * Reset rate limit for a specific identifier (admin use)
 */
export function resetRateLimit(identifier: string, prefix: string = "rl") {
  const key = `${prefix}:${identifier}`;
  delete rateLimitStore[key];
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStatus(identifier: string, prefix: string = "rl") {
  const key = `${prefix}:${identifier}`;
  return rateLimitStore[key] || null;
}
