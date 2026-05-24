import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import {
  getUserNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "../services/notificationService";
import type { User } from "@prisma/client";

type Variables = {
  user: User;
  userId: string;
};

const notificationsRouter = new Hono<{ Variables: Variables }>();

notificationsRouter.get("/", authMiddleware, async (c) => {
  const user = c.get("user");
  const [notifications, unreadCount] = await Promise.all([
    getUserNotifications(user.id),
    getUnreadCount(user.id),
  ]);
  return c.json({
    data: {
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    },
  });
});

notificationsRouter.put("/read-all", authMiddleware, async (c) => {
  const user = c.get("user");
  await markAllRead(user.id);
  return c.json({ data: { success: true } });
});

notificationsRouter.put("/:id/read", authMiddleware, async (c) => {
  const user = c.get("user");
  const id = c.req.param("id") ?? "";
  if (!id)
    return c.json({ error: { message: "Missing id", code: "BAD_REQUEST" } }, 400);
  await markOneRead(id, user.id);
  return c.json({ data: { success: true } });
});

export { notificationsRouter };
