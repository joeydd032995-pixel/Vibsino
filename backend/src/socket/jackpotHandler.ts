import type { Server as IOServer, Socket } from "socket.io";
import { getCurrentJackpot } from "../services/gameService";

export function setupJackpotHandler(io: IOServer, socket: Socket) {
  socket.join("jackpot");

  // Send current jackpot state on join
  getCurrentJackpot()
    .then((state) => {
      socket.emit("jackpot:state", state);
    })
    .catch(console.error);
}
