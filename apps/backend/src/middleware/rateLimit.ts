import { Context, Next } from "hono";
import { env } from "../config/env";

// Simple in-memory rate limiter
class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> =
    new Map();
  private windowSize: number;
  private maxRequests: number;

  constructor(windowSizeMs: number, maxRequests: number) {
    this.windowSize = windowSizeMs;
    this.maxRequests = maxRequests;

    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), env.RATE_LIMIT_WINDOW_MS);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  private getClientId(c: Context): string {
    // Try to get IP from various headers (for reverse proxy scenarios)
    const forwarded = c.req.header("x-forwarded-for");
    const realIp = c.req.header("x-real-ip");
    const clientIp = forwarded?.split(",")[0].trim() || realIp || "unknown"; // Include user agent to make it slightly harder to bypass
    const userAgent = c.req.header("user-agent") || "unknown";

    return `${clientIp}:${userAgent.slice(
      0,
      env.RATE_LIMIT_USER_AGENT_LENGTH
    )}`;
  }

  isAllowed(c: Context): { allowed: boolean; retryAfter?: number } {
    const clientId = this.getClientId(c);
    const now = Date.now();

    const clientData = this.requests.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      // First request or window expired
      this.requests.set(clientId, {
        count: 1,
        resetTime: now + this.windowSize,
      });
      return { allowed: true };
    }

    if (clientData.count >= this.maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Increment counter
    clientData.count++;
    return { allowed: true };
  }
}

// Different rate limiters for different endpoint types
const globalLimiter = new RateLimiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX_REQUESTS
);
const authLimiter = new RateLimiter(
  env.RATE_LIMIT_AUTH_WINDOW_MS,
  env.RATE_LIMIT_AUTH_MAX_REQUESTS
);
const strictLimiter = new RateLimiter(
  env.RATE_LIMIT_STRICT_WINDOW_MS,
  env.RATE_LIMIT_STRICT_MAX_REQUESTS
);

export function createRateLimitMiddleware(limiter: RateLimiter) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const result = limiter.isAllowed(c);

    if (!result.allowed) {
      return c.json(
        {
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: result.retryAfter,
        },
        429,
        {
          "Retry-After": result.retryAfter?.toString() || "60",
          "X-RateLimit-Remaining": "0",
        }
      );
    }

    await next();
  };
}

// Export pre-configured middleware
export const globalRateLimit = createRateLimitMiddleware(globalLimiter);
export const authRateLimit = createRateLimitMiddleware(authLimiter);
export const strictRateLimit = createRateLimitMiddleware(strictLimiter);

// Utility to get rate limit info for headers
export function getRateLimitHeaders(c: Context, limiter: RateLimiter) {
  const clientId = (limiter as any).getClientId(c);
  const clientData = (limiter as any).requests.get(clientId);

  if (!clientData) {
    return {
      "X-RateLimit-Limit": (limiter as any).maxRequests.toString(),
      "X-RateLimit-Remaining": (limiter as any).maxRequests.toString(),
      "X-RateLimit-Reset": Math.ceil(
        (Date.now() + (limiter as any).windowSize) / 1000
      ).toString(),
    };
  }

  const remaining = Math.max(
    0,
    (limiter as any).maxRequests - clientData.count
  );

  return {
    "X-RateLimit-Limit": (limiter as any).maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(clientData.resetTime / 1000).toString(),
  };
}
