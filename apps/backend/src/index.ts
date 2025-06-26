import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";

// Import database connection
import { sql } from "./db/connection";

// Import security middleware
import { globalRateLimit } from "./middleware/rateLimit";
import { createSecureErrorHandler } from "./middleware/errorHandler";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import transactionRoutes from "src/routes/transactions";
import categoryRoutes from "src/routes/categories";
import budgetRoutes from "src/routes/budgets";
import { env } from "./config/env";

const app = new Hono();

// Security middleware - apply rate limiting first
app.use("*", globalRateLimit);

// CORS middleware with proper cross-origin cookie support
app.use(
  "*",
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Cache-Control",
    ],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Set-Cookie"],
    maxAge: 86400, // 24 hours for preflight cache
  })
);

// Security headers middleware
app.use("*", async (c, next) => {
  await next();

  // Add security headers
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "1; mode=block");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
});

app.use("*", logger());
app.use("*", prettyJSON());

// Health check
app.get("/", (c) => {
  return c.json({
    message: "Budget Tracker API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// Cookie debug endpoint
app.get("/debug/cookies", (c) => {
  const cookies = c.req.header("cookie") || "";
  const userAgent = c.req.header("user-agent") || "";
  const origin = c.req.header("origin") || "";
  const referer = c.req.header("referer") || "";

  return c.json({
    success: true,
    debug: {
      receivedCookies: cookies ? true : false,
      cookieString: cookies,
      userAgent: userAgent.substring(0, 100),
      origin,
      referer,
      corsOrigin: env.CORS_ORIGIN,
      timestamp: new Date().toISOString(),
      headers: {
        "access-control-allow-origin": c.res.headers.get(
          "access-control-allow-origin"
        ),
        "access-control-allow-credentials": c.res.headers.get(
          "access-control-allow-credentials"
        ),
      },
    },
  });
});

// API Routes
app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/transactions", transactionRoutes);
app.route("/api/categories", categoryRoutes);
app.route("/api/budgets", budgetRoutes);

// Error handler
app.onError(createSecureErrorHandler());

// 404 handler with security
app.notFound((c) => {
  // Don't reveal too much information about missing routes
  return c.json(
    {
      success: false,
      error: "Endpoint not found",
      statusCode: 404,
      timestamp: new Date().toISOString(),
    },
    404
  );
});

const port = env.PORT;

const server = {
  port,
  fetch: app.fetch,
};

console.log(`🚀 Budget Tracker API starting on port ${port}`);

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...");
    const result =
      await sql`SELECT NOW() as now, current_database() as db_name, version() as version`;

    if (result && result.length > 0) {
      const { now, db_name, version } = result[0] as any;
      console.log("✅ Database connection established");
      console.log(`📅 Server time: ${now}`);
      console.log(`🗄️  Database: ${db_name}`);
      console.log(`🐘 PostgreSQL version: ${version.split(" ")[0]}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

testDatabaseConnection();

export default server;
