import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { BudgetService } from "../services/budgetService";
import { authMiddleware } from "../middleware/auth";

const budgets = new Hono();

// Helper function to get user ID from context
const getUserId = (c: any): string => {
  const user = c.get("user");
  return user?.id;
};

// Request validation schemas
const createBudgetSchema = z.object({
  category_id: z.string().uuid("Invalid category ID"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
  limit_amount: z.number().positive("Budget amount must be positive"),
});

const updateBudgetSchema = z.object({
  limit_amount: z.number().positive("Budget amount must be positive"),
});

const budgetQuerySchema = z.object({
  month: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(12))
    .optional(),
  year: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(2000).max(2100))
    .optional(),
});

// Apply auth middleware to all routes
budgets.use("*", authMiddleware);

// Get all budgets for user
budgets.get("/", zValidator("query", budgetQuerySchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { month, year } = c.req.valid("query");

    const budgetList = await BudgetService.getByUser(userId, month, year);

    return c.json({
      success: true,
      data: budgetList,
    });
  } catch (error) {
    console.error("Error fetching budgets:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch budgets",
      },
      500
    );
  }
});

// Create new budget
budgets.post("/", zValidator("json", createBudgetSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const budgetData = c.req.valid("json");

    const budget = await BudgetService.create(userId, budgetData);

    return c.json(
      {
        success: true,
        data: budget,
        message: "Budget created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating budget:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create budget";
    return c.json(
      {
        success: false,
        error: message,
      },
      400
    );
  }
});

// Get budget summary for dashboard
budgets.get("/summary", zValidator("query", budgetQuerySchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { month, year } = c.req.valid("query");

    const summary = await BudgetService.getBudgetSummary(userId, month, year);

    return c.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch budget summary",
      },
      500
    );
  }
});

// Get budget alerts (over budget categories)
budgets.get("/alerts", zValidator("query", budgetQuerySchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { month, year } = c.req.valid("query");

    const alerts = await BudgetService.getBudgetAlerts(userId, month, year);

    return c.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error("Error fetching budget alerts:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch budget alerts",
      },
      500
    );
  }
});

// Get specific budget by ID
budgets.get("/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const budgetId = c.req.param("id");

    const budget = await BudgetService.getById(userId, budgetId);

    if (!budget) {
      return c.json(
        {
          success: false,
          error: "Budget not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error("Error fetching budget:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch budget",
      },
      500
    );
  }
});

// Update budget
budgets.put("/:id", zValidator("json", updateBudgetSchema), async (c) => {
  try {
    const userId = getUserId(c);
    const budgetId = c.req.param("id");
    const updateData = c.req.valid("json");

    const budget = await BudgetService.update(userId, budgetId, updateData);

    if (!budget) {
      return c.json(
        {
          success: false,
          error: "Budget not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: budget,
      message: "Budget updated successfully",
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update budget";
    return c.json(
      {
        success: false,
        error: message,
      },
      400
    );
  }
});

// Delete budget
budgets.delete("/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const budgetId = c.req.param("id");

    const success = await BudgetService.delete(userId, budgetId);

    if (!success) {
      return c.json(
        {
          success: false,
          error: "Budget not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting budget:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete budget",
      },
      500
    );
  }
});

export default budgets;
