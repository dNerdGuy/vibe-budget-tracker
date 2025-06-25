import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { TransactionService } from "../services/transactionService";
import { authMiddleware } from "../middleware/auth";
import { env } from "../config/env";

const transactions = new Hono();

// Helper function to get user ID from context
const getUserId = (c: any): string => {
  const user = c.get("user");
  return user?.id;
};

// Date validation helper - accepts YYYY-MM-DD format
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// Validation schemas
const createTransactionSchema = z.object({
  category_id: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["income", "expense"]),
  date: dateSchema.optional(),
});

const updateTransactionSchema = z.object({
  category_id: z.string().optional(),
  amount: z.number().positive().optional(),
  description: z.string().min(1).optional(),
  type: z.enum(["income", "expense"]).optional(),
  date: dateSchema.optional(),
});

const transactionFiltersSchema = z.object({
  type: z.enum(["income", "expense"]).optional(),
  category_id: z.string().optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive())
    .optional(),
  offset: z.string().transform(Number).pipe(z.number().int().min(0)).optional(),
});

// Apply auth middleware to all routes
transactions.use("*", authMiddleware);

// Get all transactions for user
transactions.get(
  "/",
  zValidator("query", transactionFiltersSchema),
  async (c) => {
    try {
      const userId = getUserId(c);
      const filters = c.req.valid("query");
      const result = await TransactionService.findMany({
        userId,
        type: filters.type,
        categoryId: filters.category_id,
        startDate: filters.start_date, // Pass date string directly
        endDate: filters.end_date, // Pass date string directly
        limit: filters.limit,
        offset: filters.offset,
      });

      return c.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch transactions",
        },
        500
      );
    }
  }
);

// Get transaction by ID
transactions.get("/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const { id } = c.req.param();

    const transaction = await TransactionService.findById(id, userId);

    if (!transaction) {
      return c.json(
        {
          success: false,
          error: "Transaction not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch transaction",
      },
      500
    );
  }
});

// Create new transaction
transactions.post(
  "/",
  zValidator("json", createTransactionSchema),
  async (c) => {
    try {
      const userId = getUserId(c);
      const data = c.req.valid("json");
      const transaction = await TransactionService.create({
        user_id: userId,
        category_id: data.category_id,
        amount: data.amount,
        description: data.description,
        type: data.type,
        date: data.date ? data.date : undefined, // Pass date string directly
      });

      return c.json(
        {
          success: true,
          data: transaction,
          message: "Transaction created successfully",
        },
        201
      );
    } catch (error) {
      console.error("Error creating transaction:", error);
      return c.json(
        {
          success: false,
          error: "Failed to create transaction",
        },
        500
      );
    }
  }
);

// Update transaction
transactions.put(
  "/:id",
  zValidator("json", updateTransactionSchema),
  async (c) => {
    try {
      const userId = getUserId(c);
      const { id } = c.req.param();
      const data = c.req.valid("json");
      const transaction = await TransactionService.update(id, userId, {
        category_id: data.category_id,
        amount: data.amount,
        description: data.description,
        type: data.type,
        date: data.date, // Pass date string directly
      });

      if (!transaction) {
        return c.json(
          {
            success: false,
            error: "Transaction not found or no changes made",
          },
          404
        );
      }

      return c.json({
        success: true,
        data: transaction,
        message: "Transaction updated successfully",
      });
    } catch (error) {
      console.error("Error updating transaction:", error);
      return c.json(
        {
          success: false,
          error: "Failed to update transaction",
        },
        500
      );
    }
  }
);

// Delete transaction
transactions.delete("/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const { id } = c.req.param();

    const deleted = await TransactionService.delete(id, userId);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: "Transaction not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete transaction",
      },
      500
    );
  }
});

// Get monthly summary
transactions.get("/summary/:year/:month", async (c) => {
  try {
    const userId = getUserId(c);
    const { year, month } = c.req.param();

    const summary = await TransactionService.getMonthlySummary(
      userId,
      parseInt(year),
      parseInt(month)
    );

    return c.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching monthly summary:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch monthly summary",
      },
      500
    );
  }
});

// Get category spending
transactions.get(
  "/spending/categories",
  zValidator(
    "query",
    z.object({
      start_date: dateSchema,
      end_date: dateSchema,
    })
  ),
  async (c) => {
    try {
      const userId = getUserId(c);
      const { start_date, end_date } = c.req.valid("query");
      const spending = await TransactionService.getCategorySpending(
        userId,
        start_date, // Pass date string directly
        end_date // Pass date string directly
      );

      return c.json({
        success: true,
        data: spending,
      });
    } catch (error) {
      console.error("Error fetching category spending:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch category spending",
        },
        500
      );
    }
  }
);

// Get recent transactions
transactions.get(
  "/recent",
  zValidator(
    "query",
    z.object({
      limit: z
        .string()
        .transform(Number)
        .pipe(z.number().int().positive().max(env.MAX_PAGE_SIZE))
        .optional(),
    })
  ),
  async (c) => {
    try {
      const userId = getUserId(c);
      const { limit } = c.req.valid("query");

      const transactions = await TransactionService.getRecent(userId, limit);

      return c.json({
        success: true,
        data: transactions,
      });
    } catch (error) {
      console.error("Error fetching recent transactions:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch recent transactions",
        },
        500
      );
    }
  }
);

export default transactions;
