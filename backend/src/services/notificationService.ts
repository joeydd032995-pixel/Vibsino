import { db } from "../lib/db";
// Lazy import to avoid circular dependency — socket/index imports gameService
// which may import notificationService at module load time
function getIO() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("../socket/index") as { io: import("socket.io").Server | null }).io;
}

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  metadata?: object
) {
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // Push real-time notification to the user's personal room
  try {
    const io = getIO();
    io?.to(`user:${userId}`).emit("notification", {
      id: notification.id,
      type,
      title,
      message,
      metadata: metadata ?? null,
      createdAt: notification.createdAt.toISOString(),
    });
  } catch {
    // Socket server may not be up yet — non-fatal
  }

  return notification;
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
