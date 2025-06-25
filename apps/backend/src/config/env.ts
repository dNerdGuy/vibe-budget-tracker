import { z } from "zod";

const envSchema = z.object({
  // Database Configuration
  DB_URL: z.string().url(),
  DB_MAX_CONNECTIONS: z.coerce.number().default(20),
  DB_IDLE_TIMEOUT: z.coerce.number().default(15), // seconds
  DB_CONNECTION_TIMEOUT: z.coerce.number().default(5), // seconds

  // Server Configuration
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // JWT Configuration
  JWT_SECRET: z
    .string()
    .min(32, "JWT secret must be at least 32 characters long"),

  // Cookie Configuration
  COOKIE_ACCESS_TOKEN_MAX_AGE: z.coerce.number().default(15 * 60), // 15 minutes in seconds
  COOKIE_REFRESH_TOKEN_MAX_AGE: z.coerce.number().default(7 * 24 * 60 * 60), // 7 days in seconds
  COOKIE_SAME_SITE: z.enum(["Strict", "Lax", "None"]).default("None"),
  COOKIE_SECURE: z.coerce.boolean().optional(), // Will default to production check if not set
  // CORS Configuration
  CORS_ORIGIN: z.string().url(),
  FRONTEND_URL: z.string().url(), // Frontend URL for email links

  // Security Configuration
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  PASSWORD_RESET_EXPIRY_HOURS: z.coerce.number().default(1), // Password reset token expiry in hours

  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(1000), // requests per window
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(900000), // 15 minutes
  RATE_LIMIT_AUTH_MAX_REQUESTS: z.coerce.number().default(10), // auth requests per window
  RATE_LIMIT_STRICT_WINDOW_MS: z.coerce.number().default(60000), // 1 minute
  RATE_LIMIT_STRICT_MAX_REQUESTS: z.coerce.number().default(20), // strict requests per window
  RATE_LIMIT_USER_AGENT_LENGTH: z.coerce.number().default(50), // max user agent length for fingerprinting

  // Pagination Configuration
  DEFAULT_PAGE_SIZE: z.coerce.number().default(50),
  MAX_PAGE_SIZE: z.coerce.number().default(100),
  DASHBOARD_STATS_LIMIT: z.coerce.number().default(10),

  // Email Configuration
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),

  // App Configuration
  APP_NAME: z.string().default("Budget Tracker"),
  APP_VERSION: z.string().default("1.0.0"),
});

// Parse and validate environment variables
function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Environment validation failed:");
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join(".")}: ${err.message}`);
      });
    }
    process.exit(1);
  }
}

// Export validated environment variables
export const env = validateEnv();

// Type for the validated environment
export type Env = z.infer<typeof envSchema>;

// Helper function to check if we're in development
export const isDevelopment = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
