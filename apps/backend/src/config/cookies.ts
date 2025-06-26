import { CookieOptions } from "hono/utils/cookie";
import { env, isProduction } from "../config/env";

// Cookie configuration helper for consistent cookie settings across the app
const domain = new URL(env.CORS_ORIGIN).hostname;
export const cookieConfig: Record<
  "accessToken" | "refreshToken",
  CookieOptions
> = {
  accessToken: {
    httpOnly: true,
    secure: env.COOKIE_SECURE ?? isProduction,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.COOKIE_ACCESS_TOKEN_MAX_AGE,
    domain,
    path: "/",
  },
  refreshToken: {
    httpOnly: true,
    secure: env.COOKIE_SECURE ?? isProduction,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.COOKIE_REFRESH_TOKEN_MAX_AGE,
    domain,
    path: "/",
  },
} as const;
