import type { Server as IOServer, Socket } from "socket.io";
import { crashRoundManager } from "../services/crashService";
import { z } from "zod";

const CrashBetSchema = z.object({
  amount: z.number().positive().max(1000),
  autoCashout: z.number().min(1.01).max(1000000),
});

export function setupCrashHandler(io: IOServer, socket: Socket) {
  // Join crash room and send current round state
  socket.join("crash");
  socket.emit("crash:state", crashRoundManager.getCurrentRound());

  // Client places a bet (only during betting phase)
  socket.on("crash:bet", async (data: unknown) => {
    try {
      const { amount, autoCashout } = CrashBetSchema.parse(data);
      const result = await crashRoundManager.placeBet(
        socket.data.userId,
        socket.data.username,
        amount,
        autoCashout
      );
      socket.emit("crash:bet_ack", { success: true, ...result });
    } catch (err) {
      socket.emit("crash:bet_ack", {
        success: false,
        error: (err as Error).message,
      });
    }
  });

  // Client manually cashes out (only during flying phase)
  socket.on("crash:cashout", () => {
    try {
      const result = crashRoundManager.manualCashout(socket.data.userId);
      socket.emit("crash:cashout_ack", { success: true, ...result });
    } catch (err) {
      socket.emit("crash:cashout_ack", {
        success: false,
        error: (err as Error).message,
      });
    }
  });
}
