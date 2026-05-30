import { Hono } from "hono";
import { telegramAuth } from "../middleware/telegramAuth";
import { db } from "../lib/db";
import { signToken } from "../utils/jwt";

const telegramAuthRouter = new Hono();

telegramAuthRouter.post("/login", telegramAuth, async (c) => {
  const tgUser = c.get("tgUser");

  if (!tgUser || !tgUser.id) {
    return c.json({ error: "Invalid user data" }, 400);
  }

  const telegramId = tgUser.id.toString();
  const username = tgUser.username || `tg_${telegramId}`;

  // Find or create user
  let user = await db.user.findFirst({
    where: {
      OR: [
        { username: username },
        // You might want to add a telegramId field to the User model
        // For now, we'll use username as a fallback
      ]
    }
  });

  if (!user) {
    user = await db.user.create({
      data: {
        username,
        role: "user",
      }
    });
  }

  const token = await signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return c.json({
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      }
    }
  });
});

export { telegramAuthRouter };
