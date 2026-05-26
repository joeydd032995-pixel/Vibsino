import type { Socket } from "socket.io";
import { verifyToken } from "../utils/jwt";
import { db } from "../lib/db";

export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error("unauthorized: no token provided"));
  }
  try {
    const payload = await verifyToken(token);
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, username: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return next(new Error("unauthorized: user not found or inactive"));
    }
    socket.data.userId = user.id;
    socket.data.username = user.username;
    socket.data.role = user.role;
    next();
  } catch {
    next(new Error("unauthorized: invalid token"));
  }
}
