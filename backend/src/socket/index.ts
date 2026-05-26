import type { Server as IOServer } from "socket.io";
import { socketAuthMiddleware } from "./auth";
import { setupCrashHandler } from "./crashHandler";
import { setupChatHandler } from "./chatHandler";
import { setupJackpotHandler } from "./jackpotHandler";
import { crashRoundManager } from "../services/crashService";

// Exported so services (notificationService, gameService) can emit events
export let io: IOServer | null = null;

export function setupSocketServer(server: IOServer) {
  io = server;

  // JWT auth middleware — validates every connection
  server.use(socketAuthMiddleware);

  server.on("connection", (socket) => {
    // Each authenticated user gets their own personal room for notifications
    socket.join(`user:${socket.data.userId}`);

    setupCrashHandler(server, socket);
    setupChatHandler(server, socket);
    setupJackpotHandler(server, socket);

    socket.on("disconnect", () => {
      // cleanup handled automatically by socket.io room management
    });
  });

  // Wire crash round manager to the IO server and start the round loop
  crashRoundManager.setIO(server);
}
