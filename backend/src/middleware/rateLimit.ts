import type { Context, Next } from "hono";
import { env } from "../config/env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

export function rateLimit(maxRequests?: number, windowMs?: number) {
  const max = maxRequests ?? env.RATE_LIMIT_MAX;
  const window = windowMs ?? env.RATE_LIMIT_WINDOW_MS;

  return async (c: Context, next: Next) => {
    const key =
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown";
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + window });
      c.header("X-RateLimit-Limit", String(max));
      c.header("X-RateLimit-Remaining", String(max - 1));
      return next();
    }

    if (entry.count >= max) {
      c.header(
        "Retry-After",
        String(Math.ceil((entry.resetAt - now) / 1000))
      );
      return c.json(
        { error: { message: "Too many requests", code: "RATE_LIMITED" } },
        429
      );
    }

    entry.count++;
    c.header("X-RateLimit-Limit", String(max));
    c.header("X-RateLimit-Remaining", String(max - entry.count));
    return next();
  };
}
