import { sign, verify } from "hono/jwt";
import { UserService, User } from "./userService";
import { EmailService } from "./emailService";
import { env } from "../config/env";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  tokenType: "access" | "refresh";
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: Omit<User, "password_hash">;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private static readonly JWT_SECRET = env.JWT_SECRET;

  // Generate access token
  static generateAccessToken(user: User): Promise<string> {
    const payload: Omit<AuthTokenPayload, "iat" | "exp"> = {
      userId: user.id,
      email: user.email,
      tokenType: "access",
    };

    return sign(payload, this.JWT_SECRET, "HS256");
  }

  // Generate refresh token
  static generateRefreshToken(user: User): Promise<string> {
    const payload: Omit<AuthTokenPayload, "iat" | "exp"> = {
      userId: user.id,
      email: user.email,
      tokenType: "refresh",
    };

    return sign(payload, this.JWT_SECRET, "HS256");
  }

  // Generate both tokens
  static async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return {
      accessToken: await this.generateAccessToken(user),
      refreshToken: await this.generateRefreshToken(user),
    };
  }

  // Legacy method for backward compatibility - now generates access token
  static generateToken(user: User): Promise<string> {
    return this.generateAccessToken(user);
  }

  // Verify JWT token with type checking
  static async verifyToken(
    token: string,
    expectedType?: "access" | "refresh"
  ): Promise<AuthTokenPayload | null> {
    try {
      const decoded = await verify(token, this.JWT_SECRET, "HS256");

      // Cast to our custom payload type and validate
      const payload = decoded as unknown as AuthTokenPayload;

      // Validate required fields
      if (!payload.userId || !payload.email || !payload.tokenType) {
        return null;
      }

      // Check token type if specified
      if (expectedType && payload.tokenType !== expectedType) {
        return null;
      }

      return payload;
    } catch (error) {
      console.error("Token verification error:", error);
      return null;
    }
  }

  // Verify access token specifically
  static verifyAccessToken(token: string): Promise<AuthTokenPayload | null> {
    return this.verifyToken(token, "access");
  }

  // Verify refresh token specifically
  static verifyRefreshToken(token: string): Promise<AuthTokenPayload | null> {
    return this.verifyToken(token, "refresh");
  }

  // Register new user
  static async register(userData: RegisterData): Promise<AuthResponse> {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = await UserService.findByEmail(email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Create new user
    const user = await UserService.create({ email, password, name }); // Generate tokens
    const tokens = await this.generateTokens(user);

    const { password_hash, ...userWithoutPassword } = user;

    // Send welcome email (don't block registration if email fails)
    EmailService.sendWelcomeEmail(user.email, user.name).catch((error) => {
      console.warn("Failed to send welcome email:", error);
    });

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // Login user
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { email, password } = credentials;

    // Find user by email
    const user = await UserService.findByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await UserService.verifyPassword(
      password,
      user.password_hash
    );
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    const { password_hash: _pwd, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // Get user from token
  static async getUserFromToken(
    token: string
  ): Promise<Omit<User, "password_hash"> | null> {
    const decoded = await this.verifyToken(token);
    if (!decoded) {
      return null;
    }
    const user = await UserService.findById(decoded.userId);
    if (!user) {
      return null;
    }

    const { password_hash: _pwd, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Refresh access token using refresh token
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    const decoded = await this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      return null;
    }

    const user = await UserService.findById(decoded.userId);
    if (!user) {
      return null;
    }

    // Generate new tokens
    return this.generateTokens(user);
  }

  // Legacy method for backward compatibility
  static async refreshToken(oldToken: string): Promise<string | null> {
    const tokens = await this.refreshAccessToken(oldToken);
    return tokens ? tokens.accessToken : null;
  }

  // Password validation helper
  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }

    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }

    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push(
        "Password must contain at least one special character (@$!%*?&)"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
  // Request password reset (implementation with secure token generation)
  static async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // Check if user exists
      const user = await UserService.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return true;
      }

      // Generate a secure reset token (32 bytes = 64 hex characters)
      const resetToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""); // Store token with expiration in database (1 hour)
      const tokenSet = await UserService.setPasswordResetToken(
        email,
        resetToken
      );

      if (!tokenSet) {
        throw new Error("Failed to set password reset token");
      }

      // Send password reset email
      const emailSent = await EmailService.sendPasswordResetEmail(
        email,
        resetToken
      );

      if (!emailSent) {
        console.warn(`Password reset email failed to send to: ${email}`);
        // Don't throw error here - token is still valid, user can use it manually
      }

      console.log(`Password reset requested for: ${email}`);
      if (env.NODE_ENV === "development") {
        console.log(`Reset token (for development): ${resetToken}`);
      }

      return true;
    } catch (error) {
      console.error("Password reset request failed:", error);
      return false;
    }
  }
  // Reset password with token (complete implementation)
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Validate the new password
      const validation = this.validatePassword(newPassword);
      if (!validation.valid) {
        throw new Error(
          `Password validation failed: ${validation.errors.join(", ")}`
        );
      }

      // Use UserService to reset password with token validation
      const success = await UserService.resetPassword(token, newPassword);

      if (!success) {
        throw new Error("Invalid or expired reset token");
      }

      console.log(`Password reset completed successfully`);
      return true;
    } catch (error) {
      console.error("Password reset failed:", error);
      return false;
    }
  }
}
