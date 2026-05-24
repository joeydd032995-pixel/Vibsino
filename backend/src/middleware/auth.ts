import type { Context, Next } from "hono";
import { verifyToken } from "../utils/jwt";
import { db } from "../lib/db";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }
  const token = authHeader.slice(7);
  try {
    const payload = await verifyToken(token);
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return c.json(
        {
          error: {
            message: "User not found or inactive",
            code: "USER_INACTIVE",
          },
        },
        401
      );
    }
    c.set("user", user);
    c.set("userId", user.id);
    await next();
  } catch {
    return c.json(
      { error: { message: "Invalid token", code: "INVALID_TOKEN" } },
      401
    );
  }
}

export async function adminMiddleware(c: Context, next: Next) {
  const user = c.get("user") as { role: string } | undefined;
  if (!user || user.role !== "admin") {
    return c.json(
      { error: { message: "Forbidden", code: "FORBIDDEN" } },
      403
    );
  }
  await next();
}
