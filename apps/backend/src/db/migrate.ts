import { sql } from "./connection";

// Database schema for Budget Tracker
const schema = {
  // Users table
  users: `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      email_verified BOOLEAN DEFAULT FALSE,
      password_reset_token VARCHAR(255),
      password_reset_expires TIMESTAMP
    );
  `,

  // User tokens table for session management and password resets
  user_tokens: `
    CREATE TABLE IF NOT EXISTS user_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      token_type VARCHAR(50) NOT NULL CHECK (token_type IN ('auth', 'password_reset', 'email_verification')),
      expires_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP NULL,
      ip_address INET,
      user_agent TEXT
    );
  `,

  // Categories table
  categories: `
    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      budget DECIMAL(10,2) DEFAULT 0,
      color VARCHAR(7) DEFAULT '#3B82F6',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, name)
    );
  `,

  // Transactions table
  transactions: `
    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      amount DECIMAL(10,2) NOT NULL,
      description TEXT NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
      date DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `,

  // Budgets table (monthly budget limits)
  budgets: `
    CREATE TABLE IF NOT EXISTS budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
      year INTEGER NOT NULL,
      limit_amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, category_id, month, year)
    );
  `,
  // Indexes for better performance
  indexes: `
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
    CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_user_tokens_type ON user_tokens(token_type);
    CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at);
  `,

  // Triggers for updated_at
  triggers: `
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `,
};

// Migration function
export async function runMigrations(): Promise<void> {
  try {
    console.log("🚀 Starting database migrations...");

    // Create tables in order    await sql`${schema.users}`;
    console.log("✅ Users table created");

    await sql`${schema.user_tokens}`;
    console.log("✅ User tokens table created");

    await sql`${schema.categories}`;
    console.log("✅ Categories table created");

    await sql`${schema.transactions}`;
    console.log("✅ Transactions table created");

    await sql`${schema.budgets}`;
    console.log("✅ Budgets table created");

    // Create indexes
    await sql`${schema.indexes}`;
    console.log("✅ Indexes created");

    // Create triggers
    await sql`${schema.triggers}`;
    console.log("✅ Triggers created");

    console.log("🎉 Database migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Drop all tables (for development)
export async function dropTables(): Promise<void> {
  try {
    console.log("🗑️  Dropping all tables...");
    await sql`DROP TABLE IF EXISTS budgets CASCADE`;
    await sql`DROP TABLE IF EXISTS transactions CASCADE`;
    await sql`DROP TABLE IF EXISTS user_tokens CASCADE`;
    await sql`DROP TABLE IF EXISTS categories CASCADE`;
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`;

    console.log("✅ All tables dropped");
  } catch (error) {
    console.error("❌ Drop tables failed:", error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (process.argv[1]?.includes("migrate.ts")) {
  runMigrations()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}
