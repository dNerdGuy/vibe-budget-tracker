import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { CategoryService } from "../services/categoryService";
import { authMiddleware } from "../middleware/auth";

const categories = new Hono();

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
const createCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  budget: z.number().min(0, "Budget must be non-negative").optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i, "Color must be a valid hex color")
    .optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  budget: z.number().min(0).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

// Apply auth middleware to all routes
categories.use("*", authMiddleware);

// Get categories with spending analysis - MUST come before /:id route
categories.get(
  "/with-spending",
  zValidator(
    "query",
    z.object({
      start_date: dateSchema.optional(),
      end_date: dateSchema.optional(),
    })
  ),
  async (c) => {
    try {
      const userId = getUserId(c);
      const { start_date, end_date } = c.req.valid("query");
      const categoriesWithSpending =
        await CategoryService.getCategoriesWithStats(
          userId,
          start_date, // Pass date string directly
          end_date // Pass date string directly
        );

      return c.json({
        success: true,
        data: categoriesWithSpending,
      });
    } catch (error) {
      console.error("Error fetching categories with spending:", error);
      return c.json(
        {
          success: false,
          error: "Failed to fetch categories with spending",
        },
        500
      );
    }
  }
);

// Get budget vs actual spending comparison
categories.get("/budget-comparison", async (c) => {
  try {
    const userId = getUserId(c);

    const comparison = await CategoryService.getBudgetAnalysis(userId);

    return c.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error("Error fetching budget comparison:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch budget comparison",
      },
      500
    );
  }
});

// Get all categories for user
categories.get("/", async (c) => {
  try {
    const userId = getUserId(c);
    const userCategories = await CategoryService.findByUserId(userId);

    return c.json({
      success: true,
      data: userCategories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch categories",
      },
      500
    );
  }
});

// Get category by ID
categories.get("/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const { id } = c.req.param();

    const category = await CategoryService.findById(id, userId);

    if (!category) {
      return c.json(
        {
          success: false,
          error: "Category not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch category",
      },
      500
    );
  }
});

// Create new category
categories.post("/", zValidator("json", createCategorySchema), async (c) => {
  try {
    const userId = getUserId(c);
    const data = c.req.valid("json");

    const category = await CategoryService.create({
      user_id: userId,
      name: data.name,
      budget: data.budget,
      color: data.color,
    });

    return c.json(
      {
        success: true,
        data: category,
        message: "Category created successfully",
      },
      201
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return c.json(
      {
        success: false,
        error: "Failed to create category",
      },
      500
    );
  }
});

// Update category
categories.put("/:id", zValidator("json", updateCategorySchema), async (c) => {
  try {
    const userId = getUserId(c);
    const { id } = c.req.param();
    const data = c.req.valid("json");

    const category = await CategoryService.update(id, userId, {
      name: data.name,
      budget: data.budget,
      color: data.color,
    });

    if (!category) {
      return c.json(
        {
          success: false,
          error: "Category not found or no changes made",
        },
        404
      );
    }

    return c.json({
      success: true,
      data: category,
      message: "Category updated successfully",
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return c.json(
      {
        success: false,
        error: "Failed to update category",
      },
      500
    );
  }
});

// Delete category
categories.delete("/:id", async (c) => {
  try {
    const userId = getUserId(c);
    const { id } = c.req.param();

    const deleted = await CategoryService.delete(id, userId);

    if (!deleted) {
      return c.json(
        {
          success: false,
          error: "Category not found",
        },
        404
      );
    }

    return c.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return c.json(
      {
        success: false,
        error: "Failed to delete category",
      },
      500
    );
  }
});

export default categories;
