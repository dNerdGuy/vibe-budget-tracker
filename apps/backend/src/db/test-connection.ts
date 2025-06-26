// Test database connection
import { sql } from "./connection";

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    console.log("🔍 Testing database connection...");

    // Simple query to test connection
    const result = await sql`SELECT 1 as test`;

    if (result && result.length > 0) {
      console.log("✅ Database connection successful");
      return true;
    } else {
      console.log("❌ Database connection failed: No result returned");
      return false;
    }
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}
