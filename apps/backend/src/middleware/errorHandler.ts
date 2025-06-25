import { Context } from "hono";
import { env } from "../config/env";

export interface SecurityError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  expose?: boolean;
}

export class AppError extends Error implements SecurityError {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly expose: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    expose: boolean = false
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.expose = expose;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Secure error handler that doesn't leak sensitive information
export function createSecureErrorHandler() {
  return (err: SecurityError, c: Context) => {
    const isDevelopment = env.NODE_ENV === "development";

    // Log the full error for debugging (server-side only)
    console.error("Error occurred:", {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      timestamp: new Date().toISOString(),
      url: c.req.url,
      method: c.req.method,
      userAgent: c.req.header("user-agent"),
      ip:
        c.req.header("x-forwarded-for") ||
        c.req.header("x-real-ip") ||
        "unknown",
    });

    // Determine status code
    const statusCode = err.statusCode || 500;

    // Determine what to expose to client
    let clientMessage: string;
    let details: any = undefined;

    if (err.expose || statusCode < 500) {
      // Client errors (4xx) or explicitly marked for exposure
      clientMessage = err.message;
    } else {
      // Server errors (5xx) - don't expose internal details
      clientMessage = "Internal server error";
    }

    // In development, include more details
    if (isDevelopment && statusCode >= 500) {
      details = {
        stack: err.stack,
        originalMessage: err.message,
      };
    }

    // Security headers for error responses
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Cache-Control", "no-store");
    return c.json(
      {
        success: false,
        error: clientMessage,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
      statusCode as any
    );
  };
}

// Common error factory functions
export const createValidationError = (message: string) =>
  new AppError(message, 400, true);

export const createAuthError = (message: string = "Authentication failed") =>
  new AppError(message, 401, true);

export const createForbiddenError = (message: string = "Access denied") =>
  new AppError(message, 403, true);

export const createNotFoundError = (message: string = "Resource not found") =>
  new AppError(message, 404, true);

export const createRateLimitError = (message: string = "Rate limit exceeded") =>
  new AppError(message, 429, true);

export const createInternalError = (
  message: string = "Internal server error"
) => new AppError(message, 500, false); // Don't expose internal errors

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (c: Context, next?: any) => {
    return Promise.resolve(fn(c, next)).catch((err) => {
      if (err instanceof AppError) {
        throw err;
      }
      // Wrap unknown errors
      throw createInternalError("An unexpected error occurred");
    });
  };
}
