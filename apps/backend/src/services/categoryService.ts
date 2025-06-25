import { sql } from "../db/connection";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  budget: number;
  color: string;
  created_at: Date;
  updated_at: Date;
  // Calculated fields
  spent?: number;
  transaction_count?: number;
}

export interface CreateCategoryData {
  user_id: string;
  name: string;
  budget?: number;
  color?: string;
}

export interface UpdateCategoryData {
  name?: string;
  budget?: number;
  color?: string;
}

export class CategoryService {
  // Create a new category
  static async create(categoryData: CreateCategoryData): Promise<Category> {
    const { user_id, name, budget = 0, color = "#3B82F6" } = categoryData;

    const result = await sql`
      INSERT INTO categories (user_id, name, budget, color)
      VALUES (${user_id}, ${name}, ${budget}, ${color})
      RETURNING *
    `;

    return result[0] as Category;
  }
  // Find category by ID
  static async findById(id: string, userId: string): Promise<Category | null> {
    const result = await sql`
      SELECT * FROM categories 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    return (result[0] as Category) || null;
  }
  // Get all categories for a user
  static async findByUserId(userId: string): Promise<Category[]> {
    const result = await sql`
      SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as spent,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE c.user_id = ${userId}
      GROUP BY c.id
      ORDER BY c.name
    `;

    return result.map((row: any) => ({
      ...row,
      spent: parseFloat(String(row.spent || "0")),
      transaction_count: parseInt(String(row.transaction_count || "0")),
    })) as Category[];
  } // Update category
  static async update(
    id: string,
    userId: string,
    updateData: UpdateCategoryData
  ): Promise<Category | null> {
    // For simplicity, we'll handle each case separately
    if (
      updateData.name !== undefined &&
      updateData.budget !== undefined &&
      updateData.color !== undefined
    ) {
      const result = await sql`
        UPDATE categories 
        SET name = ${updateData.name}, budget = ${updateData.budget}, color = ${updateData.color}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    } else if (
      updateData.name !== undefined &&
      updateData.budget !== undefined
    ) {
      const result = await sql`
        UPDATE categories 
        SET name = ${updateData.name}, budget = ${updateData.budget}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    } else if (
      updateData.name !== undefined &&
      updateData.color !== undefined
    ) {
      const result = await sql`
        UPDATE categories 
        SET name = ${updateData.name}, color = ${updateData.color}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    } else if (
      updateData.budget !== undefined &&
      updateData.color !== undefined
    ) {
      const result = await sql`
        UPDATE categories 
        SET budget = ${updateData.budget}, color = ${updateData.color}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    } else if (updateData.name !== undefined) {
      const result = await sql`
        UPDATE categories 
        SET name = ${updateData.name}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    } else if (updateData.budget !== undefined) {
      const result = await sql`
        UPDATE categories 
        SET budget = ${updateData.budget}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    } else if (updateData.color !== undefined) {
      const result = await sql`
        UPDATE categories 
        SET color = ${updateData.color}
        WHERE id = ${id} AND user_id = ${userId}
        RETURNING *
      `;
      return (result[0] as Category) || null;
    }

    return null;
  }
  // Delete category
  static async delete(id: string, userId: string): Promise<boolean> {
    // First, set category_id to null for all transactions using this category
    await sql`
      UPDATE transactions 
      SET category_id = NULL 
      WHERE category_id = ${id} AND user_id = ${userId}
    `;

    // Then delete the category
    const result = await sql`
      DELETE FROM categories 
      WHERE id = ${id} AND user_id = ${userId}
    `;

    return result.length > 0;
  }
  // Get category budget vs spending for current month
  static async getBudgetAnalysis(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      budget: number;
      spent: number;
      remaining: number;
      percentageUsed: number;
      color: string;
    }>
  > {
    const result = await sql`
      SELECT 
        c.id,
        c.name,
        c.budget,
        c.color,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as spent
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND EXTRACT(MONTH FROM t.date) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM t.date) = EXTRACT(YEAR FROM CURRENT_DATE)
      WHERE c.user_id = ${userId} AND c.budget > 0
      GROUP BY c.id, c.name, c.budget, c.color
      ORDER BY c.name
    `;

    return result.map((row: any) => {
      const budget = parseFloat(row.budget);
      const spent = parseFloat(row.spent);
      const remaining = budget - spent;
      const percentageUsed = budget > 0 ? (spent / budget) * 100 : 0;

      return {
        id: row.id,
        name: row.name,
        budget,
        spent,
        remaining,
        percentageUsed: Math.round(percentageUsed * 100) / 100,
        color: row.color,
      };
    });
  }
  // Get category spending trends (last 6 months)
  static async getSpendingTrends(userId: string): Promise<
    Array<{
      categoryId: string;
      categoryName: string;
      monthlySpending: Array<{
        month: string;
        amount: number;
      }>;
    }>
  > {
    const result = await sql`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        TO_CHAR(t.date, 'YYYY-MM') as month,
        SUM(t.amount) as amount
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.type = 'expense'
        AND t.date >= CURRENT_DATE - INTERVAL '6 months'
      WHERE c.user_id = ${userId}
      GROUP BY c.id, c.name, TO_CHAR(t.date, 'YYYY-MM')
      ORDER BY c.name, month
    `;

    // Group by category
    const categoryMap = new Map();

    for (const row of result) {
      const typedRow = row as any;
      if (!categoryMap.has(typedRow.category_id)) {
        categoryMap.set(typedRow.category_id, {
          categoryId: typedRow.category_id,
          categoryName: typedRow.category_name,
          monthlySpending: [],
        });
      }

      if (typedRow.month) {
        categoryMap.get(typedRow.category_id).monthlySpending.push({
          month: typedRow.month,
          amount: parseFloat(typedRow.amount || "0"),
        });
      }
    }

    return Array.from(categoryMap.values());
  }
  // Check if category name exists for user
  static async existsByName(
    name: string,
    userId: string,
    excludeId?: string
  ): Promise<boolean> {
    let result;

    if (excludeId) {
      result = await sql`
        SELECT COUNT(*) as count 
        FROM categories 
        WHERE name = ${name} AND user_id = ${userId} AND id != ${excludeId}
      `;
    } else {
      result = await sql`
        SELECT COUNT(*) as count 
        FROM categories 
        WHERE name = ${name} AND user_id = ${userId}
      `;
    }

    return parseInt((result[0] as any).count) > 0;
  } // Get categories with transaction counts
  static async getCategoriesWithStats(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<
    Array<{
      id: string;
      name: string;
      color: string;
      totalSpent: number;
      transactionCount: number;
    }>
  > {
    let result;

    if (startDate && endDate) {
      result = await sql`
        SELECT 
          c.id,
          c.name,
          c.color,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_spent,
          COUNT(t.id) as transaction_count
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id 
          AND t.date >= ${startDate} AND t.date <= ${endDate}
        WHERE c.user_id = ${userId}
        GROUP BY c.id, c.name, c.color
        ORDER BY total_spent DESC
      `;
    } else {
      result = await sql`
        SELECT 
          c.id,
          c.name,
          c.color,
          COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_spent,
          COUNT(t.id) as transaction_count
        FROM categories c
        LEFT JOIN transactions t ON c.id = t.category_id
        WHERE c.user_id = ${userId}
        GROUP BY c.id, c.name, c.color
        ORDER BY total_spent DESC
      `;
    }

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      color: row.color,
      totalSpent: parseFloat(row.total_spent),
      transactionCount: parseInt(row.transaction_count),
    }));
  }
}
