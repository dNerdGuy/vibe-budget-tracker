import { sql } from "../db/connection";
import { env } from "../config/env";

// ===== TYPE DEFINITIONS =====

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  amount: number;
  description: string;
  type: "income" | "expense";
  date: Date;
  created_at: Date;
  updated_at: Date;
  // Joined fields from category
  category_name?: string;
  category_color?: string;
}

export interface CreateTransactionData {
  user_id: string;
  category_id?: string;
  amount: number;
  description: string;
  type: "income" | "expense";
  date?: string; // Accept date as string in YYYY-MM-DD format
}

export interface UpdateTransactionData {
  category_id?: string;
  amount?: number;
  description?: string;
  type?: "income" | "expense";
  date?: string; // Accept date as string in YYYY-MM-DD format
}

export interface TransactionFilters {
  userId: string;
  type?: "income" | "expense";
  categoryId?: string;
  startDate?: string; // Accept date as string in YYYY-MM-DD format
  endDate?: string; // Accept date as string in YYYY-MM-DD format
  limit?: number;
  offset?: number;
}

export interface MonthlySummary {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  transactionCount: number;
}

export interface CategorySpending {
  categoryId: string | null;
  categoryName: string;
  amount: number;
  transactionCount: number;
}

// Internal interface for database row mapping
interface CategorySpendingRow {
  category_id: string | null;
  category_name: string;
  amount: string;
  transaction_count: string;
}

// ===== SERVICE CLASS =====

export class TransactionService {
  // Create a new transaction
  static async create(
    transactionData: CreateTransactionData
  ): Promise<Transaction> {
    const { user_id, category_id, amount, description, type, date } =
      transactionData;
    // Use the provided date string or current date in YYYY-MM-DD format
    const transactionDate = date || new Date().toISOString().split("T")[0];

    const result = await sql`
      INSERT INTO transactions (user_id, category_id, amount, description, type, date)
      VALUES (${user_id}, ${
      category_id || null
    }, ${amount}, ${description}, ${type}, ${transactionDate})
      RETURNING *
    `;

    return result[0] as Transaction;
  }

  // Find transaction by ID
  static async findById(
    id: string,
    userId: string
  ): Promise<Transaction | null> {
    const result = await sql`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ${id} AND t.user_id = ${userId}
    `;
    return result.length > 0 ? (result[0] as Transaction) : null;
  }

  // Get transactions with filters
  static async findMany(filters: TransactionFilters): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    const {
      userId,
      type,
      categoryId,
      startDate,
      endDate,
      limit = env.DEFAULT_PAGE_SIZE,
      offset = 0,
    } = filters;

    // Handle different filter combinations
    if (type && categoryId && startDate && endDate) {
      const result = await sql`
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.type = ${type} AND t.category_id = ${categoryId} AND t.date >= ${startDate} AND t.date <= ${endDate}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM transactions t
        WHERE t.user_id = ${userId} AND t.type = ${type} AND t.category_id = ${categoryId} AND t.date >= ${startDate} AND t.date <= ${endDate}
      `;

      return {
        transactions: result as Transaction[],
        total: parseInt(countResult[0]?.total || "0"),
      };
    }

    if (type) {
      const result = await sql`
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.type = ${type}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM transactions t
        WHERE t.user_id = ${userId} AND t.type = ${type}
      `;

      return {
        transactions: result as Transaction[],
        total: parseInt(countResult[0]?.total || "0"),
      };
    }

    if (categoryId) {
      const result = await sql`
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.category_id = ${categoryId}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM transactions t
        WHERE t.user_id = ${userId} AND t.category_id = ${categoryId}
      `;

      return {
        transactions: result as Transaction[],
        total: parseInt(countResult[0]?.total || "0"),
      };
    }

    if (startDate && endDate) {
      const result = await sql`
        SELECT t.*, c.name as category_name, c.color as category_color
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ${userId} AND t.date >= ${startDate} AND t.date <= ${endDate}
        ORDER BY t.date DESC, t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const countResult = await sql`
        SELECT COUNT(*) as total FROM transactions t
        WHERE t.user_id = ${userId} AND t.date >= ${startDate} AND t.date <= ${endDate}
      `;

      return {
        transactions: result as Transaction[],
        total: parseInt(countResult[0]?.total || "0"),
      };
    }

    // Default: get all transactions
    const result = await sql`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total FROM transactions t
      WHERE t.user_id = ${userId}
    `;
    return {
      transactions: result as Transaction[],
      total: parseInt(countResult[0]?.total || "0"),
    };
  }

  // Update transaction
  static async update(
    id: string,
    userId: string,
    updateData: UpdateTransactionData
  ): Promise<Transaction | null> {
    const { amount, description, type, date, category_id } = updateData;

    // Build update query based on provided fields
    const updateFields: string[] = [];
    const values: any[] = [];

    if (amount !== undefined) {
      updateFields.push("amount = $" + (values.length + 1));
      values.push(amount);
    }

    if (description !== undefined) {
      updateFields.push("description = $" + (values.length + 1));
      values.push(description);
    }

    if (type !== undefined) {
      updateFields.push("type = $" + (values.length + 1));
      values.push(type);
    }

    if (date !== undefined) {
      updateFields.push("date = $" + (values.length + 1));
      values.push(date);
    }

    if (category_id !== undefined) {
      updateFields.push("category_id = $" + (values.length + 1));
      values.push(category_id);
    }

    if (updateFields.length === 0) {
      return null; // No fields to update
    }

    // Add updated_at
    updateFields.push("updated_at = NOW()");

    // Add WHERE clause parameters
    const whereClause =
      "WHERE id = $" +
      (values.length + 1) +
      " AND user_id = $" +
      (values.length + 2);
    values.push(id, userId);

    const query = `
      UPDATE transactions 
      SET ${updateFields.join(", ")}
      ${whereClause}
      RETURNING *
    `;

    const result = await sql.unsafe(query, values);
    return result.length > 0 ? (result[0] as Transaction) : null;
  } // Delete transaction
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM transactions 
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  }
  // Get monthly summary
  static async getMonthlySummary(
    userId: string,
    year: number,
    month: number
  ): Promise<MonthlySummary> {
    const result = await sql`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE user_id = ${userId} 
        AND EXTRACT(YEAR FROM date) = ${year} 
        AND EXTRACT(MONTH FROM date) = ${month}
    `;

    const row = result[0];
    const totalIncome = parseFloat(row?.total_income || "0");
    const totalExpenses = parseFloat(row?.total_expenses || "0");

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: parseInt(row?.transaction_count || "0"),
    };
  } // Get category spending for a period
  static async getCategorySpending(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CategorySpending[]> {
    const result = await sql`
      SELECT 
        t.category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        SUM(t.amount) as amount,
        COUNT(*) as transaction_count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId} 
        AND t.type = 'expense'
        AND t.date >= ${startDate} 
        AND t.date <= ${endDate}
      GROUP BY t.category_id, c.name      ORDER BY amount DESC
    `;

    return (result as CategorySpendingRow[]).map((row) => ({
      categoryId: row.category_id,
      categoryName: row.category_name,
      amount: parseFloat(row.amount),
      transactionCount: parseInt(row.transaction_count),
    }));
  }

  // Get recent transactions
  static async getRecent(
    userId: string,
    limit: number = env.DASHBOARD_STATS_LIMIT
  ): Promise<Transaction[]> {
    const result = await sql`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ${userId}
      ORDER BY t.created_at DESC
      LIMIT ${limit}
    `;

    return result as Transaction[];
  }
}
