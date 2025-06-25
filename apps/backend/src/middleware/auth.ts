import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { AuthService } from "../services/authService";
import { TokenBlacklist } from "../services/tokenBlacklist";

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    created_at: Date;
    updated_at: Date;
    email_verified: boolean;
  };
}

// Middleware to authenticate JWT token
// Middleware to authenticate JWT token
export async function authMiddleware(
  c: Context,
  next: Next
): Promise<Response | void> {
  try {
    // Get access token from cookie only
    const accessToken = getCookie(c, "access_token");

    if (!accessToken) {
      return c.json(
        {
          success: false,
          error: "No access token provided. Please login first.",
        },
        401
      );
    }

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(accessToken);
    if (isBlacklisted) {
      return c.json(
        {
          success: false,
          error: "Token has been invalidated. Please login again.",
        },
        401
      );
    } // Verify JWT token
    const decoded = await AuthService.verifyToken(accessToken);
    if (!decoded) {
      return c.json(
        {
          success: false,
          error:
            "Invalid or expired access token. Please refresh your session.",
        },
        401
      );
    }

    // Check if token was issued before user logout timestamp
    const isValidForUser = await TokenBlacklist.isTokenValidForUser(
      decoded.userId,
      decoded.iat
    );
    if (!isValidForUser) {
      return c.json(
        {
          success: false,
          error: "Session has been terminated. Please login again.",
        },
        401
      );
    }

    const user = await AuthService.getUserFromToken(accessToken);

    if (!user) {
      return c.json(
        {
          success: false,
          error:
            "Invalid or expired access token. Please refresh your session.",
        },
        401
      );
    }

    // Add user to context
    c.set("user", user);

    await next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return c.json(
      {
        success: false,
        error: "Authentication failed",
      },
      401
    );
  }
}

// Middleware to authenticate JWT token (optional - doesn't fail if no token)
export async function optionalAuthMiddleware(
  c: Context,
  next: Next
): Promise<void> {
  try {
    const accessToken = getCookie(c, "access_token");

    if (accessToken) {
      const user = await AuthService.getUserFromToken(accessToken);

      if (user) {
        c.set("user", user);
      }
    }

    await next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    // Continue without setting user
    await next();
  }
}

// Helper function to get authenticated user from context
export function getAuthUser(c: Context): AuthContext["user"] | null {
  return c.get("user") || null;
}

// Helper function to get authenticated user ID
export function getAuthUserId(c: Context): string | null {
  const user = getAuthUser(c);
  return user?.id || null;
}

// Middleware to check if user is verified
export async function requireVerifiedUser(
  c: Context,
  next: Next
): Promise<Response | void> {
  const user = getAuthUser(c);

  if (!user) {
    return c.json(
      {
        success: false,
        error: "Authentication required",
      },
      401
    );
  }

  if (!user.email_verified) {
    return c.json(
      {
        success: false,
        error: "Email verification required. Please verify your email address.",
      },
      403
    );
  }

  await next();
}
