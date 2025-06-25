import { env, isProduction } from "../config/env";

// Cookie configuration helper for consistent cookie settings across the app
export const cookieConfig = {
  accessToken: {
    httpOnly: true,
    secure: env.COOKIE_SECURE ?? isProduction,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.COOKIE_ACCESS_TOKEN_MAX_AGE,
    path: "/",
  },
  refreshToken: {
    httpOnly: true,
    secure: env.COOKIE_SECURE ?? isProduction,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: env.COOKIE_REFRESH_TOKEN_MAX_AGE,
    path: "/",
  },
} as const;
