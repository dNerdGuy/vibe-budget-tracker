import { sql } from "./connection";

async function createTables(): Promise<void> {
  try {
    console.log("🏗️  Creating database tables...");

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create user_tokens table for multi-session auth
    await sql`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        budget DECIMAL(12, 2) DEFAULT 0,
        color VARCHAR(7) DEFAULT '#3B82F6',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, name)
      )
    `;

    // Create transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
        amount DECIMAL(12, 2) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
        description TEXT NOT NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `; // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_tokens_expires_at ON user_tokens(expires_at)
    `;

    // Create token blacklist table for security
    await sql`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `;

    // Create user logout timestamps table for session invalidation
    await sql`
      CREATE TABLE IF NOT EXISTS user_logout_timestamps (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        logout_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for blacklist tables
    await sql`
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_hash ON token_blacklist(token_hash)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires ON token_blacklist(expires_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_logout_timestamps_user_id ON user_logout_timestamps(user_id)
    `;

    console.log("✅ All tables created successfully!");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  }
}

async function initializeDatabase(): Promise<void> {
  try {
    console.log("🚀 Initializing budget tracker database...");

    await createTables();

    console.log("🎉 Database initialization completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Database initialization failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run initialization if this file is executed directly
if (import.meta.main) {
  initializeDatabase();
}

export { initializeDatabase, createTables };
