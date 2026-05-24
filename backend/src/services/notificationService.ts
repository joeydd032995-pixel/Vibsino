import { db } from "../lib/db";

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: object
) {
  return db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

export async function getUserNotifications(userId: string, limit = 30) {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return db.notification.count({ where: { userId, read: false } });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function markOneRead(id: string, userId: string) {
  await db.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}
