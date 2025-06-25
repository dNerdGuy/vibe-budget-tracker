import { sql } from "../db/connection";

// Simple token blacklist using database
export class TokenBlacklist {
  // Add token to blacklist
  static async blacklistToken(token: string, userId?: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 8); // Keep in blacklist for 8 days (longer than JWT expiry)

    await sql`
      INSERT INTO token_blacklist (token_hash, user_id, expires_at)
      VALUES (
        ${await Bun.password.hash(token)},
        ${userId || null},
        ${expiresAt}
      )
      ON CONFLICT (token_hash) DO NOTHING
    `;
  }

  // Check if token is blacklisted
  static async isBlacklisted(token: string): Promise<boolean> {
    const tokenHash = await Bun.password.hash(token);

    const result = await sql`
      SELECT 1 FROM token_blacklist 
      WHERE token_hash = ${tokenHash} 
      AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;

    return result.length > 0;
  }

  // Blacklist all tokens for a user (logout all sessions)
  static async blacklistAllUserTokens(userId: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 8);

    // Instead of blacklisting individual tokens, we'll store a timestamp
    // and consider all tokens issued before this time as invalid
    await sql`
      INSERT INTO user_logout_timestamps (user_id, logout_at)
      VALUES (${userId}, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET logout_at = NOW()
    `;
  }

  // Check if token was issued before user's logout timestamp
  static async isTokenValidForUser(
    userId: string,
    tokenIssuedAt: number
  ): Promise<boolean> {
    const result = await sql`
      SELECT logout_at FROM user_logout_timestamps 
      WHERE user_id = ${userId}
    `;

    if (result.length === 0) {
      return true; // No logout timestamp, token is valid
    }

    const logoutTimestamp = new Date(result[0].logout_at).getTime() / 1000;
    return tokenIssuedAt > logoutTimestamp;
  }

  // Clean up expired blacklist entries (maintenance)
  static async cleanupExpired(): Promise<void> {
    await sql`
      DELETE FROM token_blacklist 
      WHERE expires_at IS NOT NULL AND expires_at < NOW()
    `;

    // Clean up old logout timestamps (older than 30 days)
    await sql`
      DELETE FROM user_logout_timestamps 
      WHERE logout_at < NOW() - INTERVAL '30 days'
    `;
  }
}

// Auto-cleanup every hour
setInterval(() => {
  TokenBlacklist.cleanupExpired().catch(console.error);
}, 3600000);
