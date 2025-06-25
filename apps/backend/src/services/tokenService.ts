import { sql } from "../db/connection";
import crypto from "crypto";

export interface UserToken {
  id: string;
  user_id: string;
  token: string;
  token_type: "auth" | "password_reset" | "email_verification";
  expires_at: Date | null;
  created_at: Date;
  used_at: Date | null;
  ip_address?: string;
  user_agent?: string;
}

export interface CreateTokenData {
  user_id: string;
  token_type: "auth" | "password_reset" | "email_verification";
  expires_at?: Date;
  ip_address?: string;
  user_agent?: string;
}

export class TokenService {
  // Generate a secure random token
  static generateSecureToken(length: number = 64): string {
    return crypto.randomBytes(length).toString("base64url");
  }

  // Create a new token
  static async createToken(data: CreateTokenData): Promise<UserToken> {
    const token = this.generateSecureToken();

    const result = await sql`
      INSERT INTO user_tokens (user_id, token, token_type, expires_at, ip_address, user_agent)
      VALUES (${data.user_id}, ${token}, ${data.token_type}, ${
      data.expires_at || null
    }, ${data.ip_address || null}, ${data.user_agent || null})
      RETURNING *
    `;

    return result[0] as UserToken;
  }

  // Find a token by its value
  static async findByToken(token: string): Promise<UserToken | null> {
    const result = await sql`
      SELECT * FROM user_tokens 
      WHERE token = ${token} AND used_at IS NULL
    `;

    return (result[0] as UserToken) || null;
  }

  // Find tokens by user ID and type
  static async findByUserAndType(
    userId: string,
    tokenType: UserToken["token_type"]
  ): Promise<UserToken[]> {
    const result = await sql`
      SELECT * FROM user_tokens 
      WHERE user_id = ${userId} AND token_type = ${tokenType} AND used_at IS NULL
      ORDER BY created_at DESC
    `;

    return result as UserToken[];
  }

  // Verify a token (check if valid and not expired)
  static async verifyToken(
    token: string,
    tokenType?: UserToken["token_type"]
  ): Promise<UserToken | null> {
    let result;

    if (tokenType) {
      result = await sql`
        SELECT * FROM user_tokens 
        WHERE token = ${token} AND used_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
        AND token_type = ${tokenType}
      `;
    } else {
      result = await sql`
        SELECT * FROM user_tokens 
        WHERE token = ${token} AND used_at IS NULL
        AND (expires_at IS NULL OR expires_at > NOW())
      `;
    }

    return (result[0] as UserToken) || null;
  }

  // Mark a token as used
  static async markTokenAsUsed(token: string): Promise<void> {
    await sql`
      UPDATE user_tokens 
      SET used_at = NOW() 
      WHERE token = ${token}
    `;
  }

  // Revoke all tokens for a user (useful for logout all sessions)
  static async revokeAllUserTokens(
    userId: string,
    tokenType?: UserToken["token_type"]
  ): Promise<void> {
    if (tokenType) {
      await sql`
        UPDATE user_tokens 
        SET used_at = NOW() 
        WHERE user_id = ${userId} AND used_at IS NULL AND token_type = ${tokenType}
      `;
    } else {
      await sql`
        UPDATE user_tokens 
        SET used_at = NOW() 
        WHERE user_id = ${userId} AND used_at IS NULL
      `;
    }
  }

  // Revoke a specific token
  static async revokeToken(token: string): Promise<void> {
    await sql`
      UPDATE user_tokens 
      SET used_at = NOW() 
      WHERE token = ${token}
    `;
  }

  // Clean up expired tokens (maintenance task)
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await sql`
      DELETE FROM user_tokens 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

    // Note: Bun's SQL may not return rowCount directly, so we'll return 0 for now
    return 0;
  }

  // Get active session count for a user
  static async getActiveSessionCount(userId: string): Promise<number> {
    const result = await sql`
      SELECT COUNT(*) as count FROM user_tokens 
      WHERE user_id = ${userId} AND token_type = 'auth' AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    return parseInt((result[0] as any).count);
  }

  // Get user's active sessions with metadata
  static async getUserActiveSessions(userId: string): Promise<
    Array<{
      id: string;
      created_at: Date;
      ip_address?: string;
      user_agent?: string;
    }>
  > {
    const result = await sql`
      SELECT id, created_at, ip_address, user_agent
      FROM user_tokens 
      WHERE user_id = ${userId} AND token_type = 'auth' AND used_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `;

    return (result as any[]).map((row) => ({
      id: row.id,
      created_at: row.created_at,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
    }));
  }

  // Create an auth token with default expiration (7 days)
  static async createAuthToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserToken> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    return this.createToken({
      user_id: userId,
      token_type: "auth",
      expires_at: expiresAt,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
  }

  // Create a password reset token with short expiration (1 hour)
  static async createPasswordResetToken(userId: string): Promise<UserToken> {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour from now

    // Revoke any existing password reset tokens
    await this.revokeAllUserTokens(userId, "password_reset");

    return this.createToken({
      user_id: userId,
      token_type: "password_reset",
      expires_at: expiresAt,
    });
  }

  // Create an email verification token (no expiration by default)
  static async createEmailVerificationToken(
    userId: string
  ): Promise<UserToken> {
    // Revoke any existing email verification tokens
    await this.revokeAllUserTokens(userId, "email_verification");

    return this.createToken({
      user_id: userId,
      token_type: "email_verification",
    });
  }
}
