import { sql } from "../db/connection";
import { env } from "../config/env";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: Date;
  updated_at: Date;
  email_verified: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  email_verified?: boolean;
  password?: string;
}

export class UserService {
  // Create a new user
  static async create(userData: CreateUserData): Promise<User> {
    const { email, password, name } = userData;
    const password_hash = await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: env.BCRYPT_ROUNDS,
    });

    const result = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${email}, ${password_hash}, ${name})
      RETURNING *
    `;

    return result[0] as User;
  }

  // Find user by email
  static async findByEmail(email: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE email = ${email}`;
    return result.length > 0 ? (result[0] as User) : null;
  }

  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    const result = await sql`SELECT * FROM users WHERE id = ${id}`;
    return result.length > 0 ? (result[0] as User) : null;
  }

  // Update user
  static async update(
    id: string,
    userData: UpdateUserData
  ): Promise<User | null> {
    // Build update queries conditionally using template literals
    let result;

    if (userData.password) {
      const password_hash = await Bun.password.hash(userData.password, {
        algorithm: "bcrypt",
        cost: env.BCRYPT_ROUNDS,
      });
      if (
        userData.email &&
        userData.name &&
        userData.email_verified !== undefined
      ) {
        result = await sql`
          UPDATE users 
          SET email = ${userData.email}, name = ${userData.name}, email_verified = ${userData.email_verified}, password_hash = ${password_hash}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else if (userData.email && userData.name) {
        result = await sql`
          UPDATE users 
          SET email = ${userData.email}, name = ${userData.name}, password_hash = ${password_hash}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        result = await sql`
          UPDATE users 
          SET password_hash = ${password_hash}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      }
    } else if (
      userData.email &&
      userData.name &&
      userData.email_verified !== undefined
    ) {
      result = await sql`
        UPDATE users 
        SET email = ${userData.email}, name = ${userData.name}, email_verified = ${userData.email_verified}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (userData.email && userData.name) {
      result = await sql`
        UPDATE users 
        SET email = ${userData.email}, name = ${userData.name}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (userData.email && userData.email_verified !== undefined) {
      result = await sql`
        UPDATE users 
        SET email = ${userData.email}, email_verified = ${userData.email_verified}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (userData.name && userData.email_verified !== undefined) {
      result = await sql`
        UPDATE users 
        SET name = ${userData.name}, email_verified = ${userData.email_verified}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (userData.email) {
      result = await sql`
        UPDATE users 
        SET email = ${userData.email}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (userData.name) {
      result = await sql`
        UPDATE users 
        SET name = ${userData.name}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else if (userData.email_verified !== undefined) {
      result = await sql`
        UPDATE users 
        SET email_verified = ${userData.email_verified}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      return null; // No fields to update
    }

    return result && result.length > 0 ? (result[0] as User) : null;
  }

  // Delete user
  static async delete(id: string): Promise<boolean> {
    const result = await sql`DELETE FROM users WHERE id = ${id}`;
    return result.length > 0;
  }

  // Verify password using Bun.password
  static async verifyPassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await Bun.password.verify(plainPassword, hashedPassword);
  }
  // Set password reset token
  static async setPasswordResetToken(
    email: string,
    token: string
  ): Promise<boolean> {
    const expires = new Date(
      Date.now() + env.PASSWORD_RESET_EXPIRY_HOURS * 60 * 60 * 1000
    );

    const result = await sql`
      UPDATE users 
      SET password_reset_token = ${token}, password_reset_expires = ${expires}
      WHERE email = ${email}
    `;
    return result.length > 0;
  }

  // Reset password using token
  static async resetPassword(
    token: string,
    newPassword: string
  ): Promise<boolean> {
    const password_hash = await Bun.password.hash(newPassword, {
      algorithm: "bcrypt",
      cost: env.BCRYPT_ROUNDS,
    });

    const result = await sql`
      UPDATE users 
      SET password_hash = ${password_hash}, password_reset_token = NULL, password_reset_expires = NULL 
      WHERE password_reset_token = ${token} AND password_reset_expires > NOW()
    `;
    return result.length > 0;
  }

  // Get user stats
  static async getUserStats(userId: string): Promise<{
    totalTransactions: number;
    totalCategories: number;
    totalIncome: number;
    totalExpenses: number;
  }> {
    const result = await sql`
      SELECT 
        COUNT(t.id) as total_transactions,
        COUNT(DISTINCT c.id) as total_categories,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expenses
      FROM users u
      LEFT JOIN transactions t ON u.id = t.user_id
      LEFT JOIN categories c ON u.id = c.user_id
      WHERE u.id = ${userId}
      GROUP BY u.id
    `;

    const row = result[0];

    return {
      totalTransactions: parseInt(row?.total_transactions || "0"),
      totalCategories: parseInt(row?.total_categories || "0"),
      totalIncome: parseFloat(row?.total_income || "0"),
      totalExpenses: parseFloat(row?.total_expenses || "0"),
    };
  }
}
