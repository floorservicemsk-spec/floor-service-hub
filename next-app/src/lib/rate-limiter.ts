/**
 * In-memory rate limiter for API endpoints
 * 
 * For production with multiple instances, use Redis-based rate limiting:
 * npm install @upstash/ratelimit @upstash/redis
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimiterConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup old entries every minute
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => {
        const now = Date.now();
        const keysToDelete: string[] = [];
        this.store.forEach((entry, key) => {
          if (entry.resetTime < now) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key) => this.store.delete(key));
      }, 60000);
    }
  }

  /**
   * Check if request should be allowed
   * @returns { allowed: boolean, remaining: number, resetIn: number }
   */
  check(
    identifier: string,
    config: RateLimiterConfig
  ): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const key = identifier;
    const entry = this.store.get(key);

    // No existing entry or window expired
    if (!entry || entry.resetTime < now) {
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetIn: config.windowMs,
      };
    }

    // Within window
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetIn: entry.resetTime - now,
    };
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): { activeKeys: number; totalRequests: number } {
    let totalRequests = 0;
    this.store.forEach((entry) => {
      totalRequests += entry.count;
    });
    return {
      activeKeys: this.store.size,
      totalRequests,
    };
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Pre-configured limiters for different endpoints
export const RATE_LIMITS = {
  // Chat API: 30 messages per minute per user
  chat: {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  // AI Stream: 20 requests per minute per user (more expensive)
  aiStream: {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  // General API: 100 requests per minute per user
  api: {
    windowMs: 60 * 1000,
    maxRequests: 100,
  },
  // Auth: 10 attempts per 15 minutes per IP
  auth: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  },
} as const;

/**
 * Middleware helper for Next.js API routes
 */
export function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): { allowed: boolean; headers: Record<string, string> } {
  const config = RATE_LIMITS[limitType];
  const result = rateLimiter.check(identifier, config);

  return {
    allowed: result.allowed,
    headers: {
      "X-RateLimit-Limit": String(config.maxRequests),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(Math.ceil(result.resetIn / 1000)),
    },
  };
}
