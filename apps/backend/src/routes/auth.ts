import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { AuthService } from "../services/authService";
import { authRateLimit, strictRateLimit } from "../middleware/rateLimit";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { cookieConfig } from "../config/cookies";

const auth = new Hono();

// Apply stricter rate limiting to auth endpoints
auth.use("/login", authRateLimit);
auth.use("/register", authRateLimit);
auth.use("/forgot-password", strictRateLimit);
auth.use("/reset-password", strictRateLimit);

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

// Register new user
auth.post("/register", zValidator("json", registerSchema), async (c) => {
  try {
    const { email, password, name } = c.req.valid("json");
    const authResponse = await AuthService.register({ email, password, name });

    // Set HTTP-only cookies for both tokens
    setCookie(
      c,
      "access_token",
      authResponse.accessToken,
      cookieConfig.accessToken
    );
    setCookie(
      c,
      "refresh_token",
      authResponse.refreshToken,
      cookieConfig.refreshToken
    );

    return c.json(
      {
        success: true,
        message: "User registered successfully",
        data: { user: authResponse.user },
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return c.json(
      {
        success: false,
        error: message,
      },
      400
    );
  }
});

// Login user
auth.post("/login", zValidator("json", loginSchema), async (c) => {
  try {
    const { email, password } = c.req.valid("json");
    const authResponse = await AuthService.login({ email, password });

    // Set HTTP-only cookies for both tokens
    setCookie(
      c,
      "access_token",
      authResponse.accessToken,
      cookieConfig.accessToken
    );
    setCookie(
      c,
      "refresh_token",
      authResponse.refreshToken,
      cookieConfig.refreshToken
    );

    return c.json({
      success: true,
      message: "Login successful",
      data: { user: authResponse.user },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed";
    return c.json(
      {
        success: false,
        error: message,
      },
      401
    );
  }
});

// Verify token and get current user
auth.get("/me", async (c) => {
  try {
    // Get access token from cookie
    const accessToken = getCookie(c, "access_token");

    if (!accessToken) {
      return c.json(
        {
          success: false,
          error: "No access token provided",
        },
        401
      );
    }

    const user = await AuthService.getUserFromToken(accessToken);

    if (!user) {
      return c.json(
        {
          success: false,
          error: "Invalid or expired access token",
        },
        401
      );
    }

    return c.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Token verification failed",
      },
      401
    );
  }
});

// Refresh access token using refresh token
auth.post("/refresh", async (c) => {
  try {
    // Get refresh token from cookie
    const refreshToken = getCookie(c, "refresh_token");

    if (!refreshToken) {
      return c.json(
        {
          success: false,
          error: "No refresh token provided",
        },
        401
      );
    }

    const tokens = await AuthService.refreshAccessToken(refreshToken);

    if (!tokens) {
      return c.json(
        {
          success: false,
          error: "Token refresh failed",
        },
        401
      );
    } // Set new tokens as HTTP-only cookies
    setCookie(c, "access_token", tokens.accessToken, cookieConfig.accessToken);

    setCookie(
      c,
      "refresh_token",
      tokens.refreshToken,
      cookieConfig.refreshToken
    );

    return c.json({
      success: true,
      message: "Tokens refreshed successfully",
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Token refresh failed",
      },
      401
    );
  }
});

// Request password reset
auth.post(
  "/forgot-password",
  zValidator("json", resetPasswordRequestSchema),
  async (c) => {
    try {
      const { email } = c.req.valid("json");

      await AuthService.requestPasswordReset(email);

      return c.json({
        success: true,
        message:
          "If an account with that email exists, a reset code has been sent",
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Password reset request failed",
        },
        500
      );
    }
  }
);

// Reset password with token
auth.post(
  "/reset-password",
  zValidator("json", resetPasswordSchema),
  async (c) => {
    try {
      const { token, password } = c.req.valid("json");

      await AuthService.resetPassword(token, password);

      return c.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Password reset failed";
      return c.json(
        {
          success: false,
          error: message,
        },
        400
      );
    }
  }
);

// Logout (server-side token invalidation)
auth.post("/logout", async (c) => {
  try {
    // Get access token from cookie
    const accessToken = getCookie(c, "access_token");

    if (accessToken) {
      const decoded = await AuthService.verifyAccessToken(accessToken);

      if (decoded) {
        // Import here to avoid circular dependency
        const { TokenBlacklist } = await import("../services/tokenBlacklist");
        await TokenBlacklist.blacklistToken(accessToken, decoded.userId);
      }
    }

    // Clear both HTTP-only cookies
    deleteCookie(c, "access_token", {
      path: "/",
    });

    deleteCookie(c, "refresh_token", {
      path: "/",
    });

    return c.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    // Still clear the cookies even if blacklisting fails
    deleteCookie(c, "access_token", {
      path: "/",
    });

    deleteCookie(c, "refresh_token", {
      path: "/",
    });

    return c.json({
      success: true, // Still return success even if blacklisting fails
      message: "Logout successful",
    });
  }
});

// Logout from all devices
auth.post("/logout-all", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        {
          success: false,
          error: "No token provided",
        },
        401
      );
    }

    const token = authHeader.substring(7);
    const decoded = await AuthService.verifyToken(token);

    if (!decoded) {
      return c.json(
        {
          success: false,
          error: "Invalid token",
        },
        401
      );
    }

    // Import here to avoid circular dependency
    const { TokenBlacklist } = await import("../services/tokenBlacklist");
    await TokenBlacklist.blacklistAllUserTokens(decoded.userId);

    return c.json({
      success: true,
      message: "Logged out from all devices",
    });
  } catch (error) {
    console.error("Logout all error:", error);
    return c.json(
      {
        success: false,
        error: "Logout failed",
      },
      500
    );
  }
});

// Validate password strength
auth.post(
  "/validate-password",
  zValidator(
    "json",
    z.object({
      password: z.string(),
    })
  ),
  async (c) => {
    try {
      const { password } = c.req.valid("json");
      const validation = AuthService.validatePassword(password);

      return c.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: "Password validation failed",
        },
        500
      );
    }
  }
);

export default auth;
