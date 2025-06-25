import { sql } from "../db/connection";
import { env } from "../config/env";

// ===== TYPE DEFINITIONS =====

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBudgetData {
  category_id: string;
  month: number;
  year: number;
  limit_amount: number;
}

export interface UpdateBudgetData {
  limit_amount?: number;
}

export interface BudgetWithCategoryInfo {
  id: string;
  user_id: string;
  category_id: string;
  category_name: string;
  category_color: string;
  month: number;
  year: number;
  limit_amount: number;
  spent_amount: number;
  remaining_amount: number;
  percentage_used: number;
  created_at: Date;
  updated_at: Date;
}

// ===== BUDGET SERVICE =====

export class BudgetService {
  // Create a new budget
  static async create(
    userId: string,
    budgetData: CreateBudgetData
  ): Promise<Budget> {
    const { category_id, month, year, limit_amount } = budgetData;

    // Validate that the budget month/year combination doesn't already exist for this category
    const existing = await sql`
      SELECT id FROM budgets 
      WHERE user_id = ${userId} AND category_id = ${category_id} AND month = ${month} AND year = ${year}
    `;

    if (existing.length > 0) {
      throw new Error("Budget already exists for this category and month");
    }

    const result = await sql`
      INSERT INTO budgets (user_id, category_id, month, year, limit_amount)
      VALUES (${userId}, ${category_id}, ${month}, ${year}, ${limit_amount})
      RETURNING *
    `;

    return result[0] as Budget;
  }

  // Get all budgets for a user with spending information
  static async getByUser(
    userId: string,
    month?: number,
    year?: number
  ): Promise<BudgetWithCategoryInfo[]> {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const result = await sql`
      SELECT 
        b.*,
        c.name as category_name,
        c.color as category_color,
        COALESCE(spent.amount, 0) as spent_amount,
        (b.limit_amount - COALESCE(spent.amount, 0)) as remaining_amount,
        CASE 
          WHEN b.limit_amount > 0 THEN (COALESCE(spent.amount, 0) / b.limit_amount * 100)
          ELSE 0 
        END as percentage_used
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN (
        SELECT 
          category_id,
          SUM(amount) as amount
        FROM transactions 
        WHERE user_id = ${userId} 
          AND type = 'expense'
          AND EXTRACT(MONTH FROM created_at) = ${targetMonth}
          AND EXTRACT(YEAR FROM created_at) = ${targetYear}
        GROUP BY category_id
      ) spent ON b.category_id = spent.category_id
      WHERE b.user_id = ${userId} 
        AND b.month = ${targetMonth} 
        AND b.year = ${targetYear}
      ORDER BY c.name ASC
    `;

    return result as BudgetWithCategoryInfo[];
  }

  // Get a specific budget by ID
  static async getById(
    userId: string,
    budgetId: string
  ): Promise<Budget | null> {
    const result = await sql`
      SELECT * FROM budgets 
      WHERE id = ${budgetId} AND user_id = ${userId}
    `;

    return result.length > 0 ? (result[0] as Budget) : null;
  }

  // Update a budget
  static async update(
    userId: string,
    budgetId: string,
    updateData: UpdateBudgetData
  ): Promise<Budget | null> {
    const { limit_amount } = updateData;

    if (limit_amount === undefined) {
      throw new Error("No update data provided");
    }

    const result = await sql`
      UPDATE budgets 
      SET limit_amount = ${limit_amount}, updated_at = NOW()
      WHERE id = ${budgetId} AND user_id = ${userId}
      RETURNING *
    `;

    return result.length > 0 ? (result[0] as Budget) : null;
  }

  // Delete a budget
  static async delete(userId: string, budgetId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM budgets 
      WHERE id = ${budgetId} AND user_id = ${userId}
    `;

    return result.count > 0;
  }

  // Get budget summary for dashboard
  static async getBudgetSummary(
    userId: string,
    month?: number,
    year?: number
  ): Promise<{
    totalBudgets: number;
    totalBudgetAmount: number;
    totalSpent: number;
    totalRemaining: number;
    overBudgetCategories: number;
  }> {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const result = await sql`
      SELECT 
        COUNT(b.id) as total_budgets,
        COALESCE(SUM(b.limit_amount), 0) as total_budget_amount,
        COALESCE(SUM(spent.amount), 0) as total_spent,
        COALESCE(SUM(b.limit_amount - COALESCE(spent.amount, 0)), 0) as total_remaining,
        COUNT(CASE WHEN COALESCE(spent.amount, 0) > b.limit_amount THEN 1 END) as over_budget_categories
      FROM budgets b
      LEFT JOIN (
        SELECT 
          category_id,
          SUM(amount) as amount
        FROM transactions 
        WHERE user_id = ${userId} 
          AND type = 'expense'
          AND EXTRACT(MONTH FROM created_at) = ${targetMonth}
          AND EXTRACT(YEAR FROM created_at) = ${targetYear}
        GROUP BY category_id
      ) spent ON b.category_id = spent.category_id
      WHERE b.user_id = ${userId} 
        AND b.month = ${targetMonth} 
        AND b.year = ${targetYear}
    `;

    const summary = result[0];
    return {
      totalBudgets: parseInt(summary.total_budgets),
      totalBudgetAmount: parseFloat(summary.total_budget_amount),
      totalSpent: parseFloat(summary.total_spent),
      totalRemaining: parseFloat(summary.total_remaining),
      overBudgetCategories: parseInt(summary.over_budget_categories),
    };
  }

  // Get budget alerts (categories over budget)
  static async getBudgetAlerts(
    userId: string,
    month?: number,
    year?: number
  ): Promise<BudgetWithCategoryInfo[]> {
    const currentDate = new Date();
    const targetMonth = month || currentDate.getMonth() + 1;
    const targetYear = year || currentDate.getFullYear();

    const result = await sql`
      SELECT 
        b.*,
        c.name as category_name,
        c.color as category_color,
        COALESCE(spent.amount, 0) as spent_amount,
        (b.limit_amount - COALESCE(spent.amount, 0)) as remaining_amount,
        (COALESCE(spent.amount, 0) / b.limit_amount * 100) as percentage_used
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN (
        SELECT 
          category_id,
          SUM(amount) as amount
        FROM transactions 
        WHERE user_id = ${userId} 
          AND type = 'expense'
          AND EXTRACT(MONTH FROM created_at) = ${targetMonth}
          AND EXTRACT(YEAR FROM created_at) = ${targetYear}
        GROUP BY category_id
      ) spent ON b.category_id = spent.category_id
      WHERE b.user_id = ${userId} 
        AND b.month = ${targetMonth} 
        AND b.year = ${targetYear}
        AND COALESCE(spent.amount, 0) > b.limit_amount
      ORDER BY (COALESCE(spent.amount, 0) - b.limit_amount) DESC
    `;

    return result as BudgetWithCategoryInfo[];
  }
}
