import type { Server as IOServer, Socket } from "socket.io";
import { db } from "../lib/db";
import { z } from "zod";

const ChatSendSchema = z.object({
  content: z.string().min(1).max(200),
  room: z.string().regex(/^[a-z0-9:-]+$/).max(50).default("global"),
});

// Simple in-memory rate limit: 1 message per second per user
const lastMessageTime = new Map<string, number>();

export function setupChatHandler(io: IOServer, socket: Socket) {
  // Auto-join global chat room and send history
  socket.join("chat:global");
  sendChatHistory(socket, "global").catch(console.error);

  // Join a specific game room
  socket.on("chat:join", (data: unknown) => {
    if (typeof data === "object" && data !== null && "room" in data) {
      const room = String((data as { room: unknown }).room).replace(/[^a-z0-9:-]/g, "");
      if (room && room.length <= 50) {
        socket.join(`chat:${room}`);
        sendChatHistory(socket, room).catch(console.error);
      }
    }
  });

  // Send a chat message
  socket.on("chat:send", async (data: unknown) => {
    try {
      const { content, room } = ChatSendSchema.parse(data);

      // Rate limit: 1 msg/s per user
      const now = Date.now();
      const last = lastMessageTime.get(socket.data.userId) ?? 0;
      if (now - last < 1000) {
        socket.emit("chat:error", { error: "Slow down — 1 message per second" });
        return;
      }
      lastMessageTime.set(socket.data.userId, now);

      const msg = await db.chatMessage.create({
        data: {
          userId: socket.data.userId,
          content,
          room,
        },
        include: { user: { select: { username: true, role: true } } },
      });

      const payload = {
        id: msg.id,
        userId: msg.userId,
        username: msg.user.username,
        role: msg.user.role,
        content: msg.content,
        room: msg.room,
        createdAt: msg.createdAt.toISOString(),
      };

      io.to(`chat:${room}`).emit("chat:message", payload);
    } catch (err) {
      socket.emit("chat:error", { error: (err as Error).message });
    }
  });
}

async function sendChatHistory(socket: Socket, room: string) {
  const messages = await db.chatMessage.findMany({
    where: { room, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { username: true, role: true } } },
  });

  const history = messages.reverse().map((m) => ({
    id: m.id,
    userId: m.userId,
    username: m.user.username,
    role: m.user.role,
    content: m.content,
    room: m.room,
    createdAt: m.createdAt.toISOString(),
  }));

  socket.emit("chat:history", { room, messages: history });
}
