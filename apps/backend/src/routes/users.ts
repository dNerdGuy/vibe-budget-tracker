import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { UserService } from "../services/userService";
import { authMiddleware, getAuthUserId } from "../middleware/auth";

const users = new Hono();

// All user routes require authentication
users.use("*", authMiddleware);

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long").optional(),
  email: z.string().email("Invalid email address").optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters long"),
});

// Get current user profile
users.get("/profile", async (c) => {
  try {
    const userId = getAuthUserId(c);
    if (!userId) {
      return c.json(
        {
          success: false,
          error: "User not found",
        },
        401
      );
    }

    const user = await UserService.findById(userId);
    if (!user) {
      return c.json(
        {
          success: false,
          error: "User not found",
        },
        404
      );
    } // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = user;

    return c.json({
      success: true,
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get user profile",
      },
      500
    );
  }
});

// Update user profile
users.put("/profile", zValidator("json", updateUserSchema), async (c) => {
  try {
    const userId = getAuthUserId(c);
    if (!userId) {
      return c.json(
        {
          success: false,
          error: "User not found",
        },
        401
      );
    }

    const updateData = c.req.valid("json");

    // Check if email already exists (if updating email)
    if (updateData.email) {
      const existingUser = await UserService.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        return c.json(
          {
            success: false,
            error: "Email is already in use",
          },
          400
        );
      }
    }

    const updatedUser = await UserService.update(userId, updateData);
    if (!updatedUser) {
      return c.json(
        {
          success: false,
          error: "Failed to update user",
        },
        500
      );
    } // Remove password hash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...userWithoutPassword } = updatedUser;

    return c.json({
      success: true,
      message: "Profile updated successfully",
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update profile",
      },
      500
    );
  }
});

// Change password
users.post(
  "/change-password",
  zValidator("json", changePasswordSchema),
  async (c) => {
    try {
      const userId = getAuthUserId(c);
      if (!userId) {
        return c.json(
          {
            success: false,
            error: "User not found",
          },
          401
        );
      }

      const { currentPassword, newPassword } = c.req.valid("json");

      // Get current user
      const user = await UserService.findById(userId);
      if (!user) {
        return c.json(
          {
            success: false,
            error: "User not found",
          },
          404
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await UserService.verifyPassword(
        currentPassword,
        user.password_hash
      );
      if (!isCurrentPasswordValid) {
        return c.json(
          {
            success: false,
            error: "Current password is incorrect",
          },
          400
        );
      }

      // Update password
      const updatedUser = await UserService.update(userId, {
        password: newPassword,
      });
      if (!updatedUser) {
        return c.json(
          {
            success: false,
            error: "Failed to update password",
          },
          500
        );
      }

      return c.json({
        success: true,
        message: "Password updated successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      return c.json(
        {
          success: false,
          error: "Failed to change password",
        },
        500
      );
    }
  }
);

// Get user statistics
users.get("/stats", async (c) => {
  try {
    const userId = getAuthUserId(c);
    if (!userId) {
      return c.json(
        {
          success: false,
          error: "User not found",
        },
        401
      );
    }

    const stats = await UserService.getUserStats(userId);

    return c.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get user statistics",
      },
      500
    );
  }
});

// Delete user account
users.delete("/account", async (c) => {
  try {
    const userId = getAuthUserId(c);
    if (!userId) {
      return c.json(
        {
          success: false,
          error: "User not found",
        },
        401
      );
    }

    const deleted = await UserService.delete(userId);
    if (!deleted) {
      return c.json(
        {
          success: false,
          error: "Failed to delete account",
        },
        500
      );
    }

    return c.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete user account error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete account",
      },
      500
    );
  }
});

export default users;
