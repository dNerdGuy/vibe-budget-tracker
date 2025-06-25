// PostgreSQL connection using Bun's native SQL API
import { SQL } from "bun";
import { env } from "../config/env";

// Initialize Bun's native SQL client
export const sql = new SQL({
  url: env.DB_URL,
  max: env.DB_MAX_CONNECTIONS,
  idleTimeout: env.DB_IDLE_TIMEOUT,
  connectionTimeout: env.DB_CONNECTION_TIMEOUT,
});

// Default export
export default sql;
