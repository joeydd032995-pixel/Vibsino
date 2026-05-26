import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let previousToken: string | null = null;

export function getSocket(token: string): Socket {
  // Reuse socket only if connected AND the token hasn't changed
  if (socket && socket.connected && token === previousToken) return socket;

  // Disconnect stale socket (disconnected or token changed)
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  previousToken = token;

  const baseURL =
    import.meta.env.VITE_BACKEND_URL ||
    `${window.location.protocol}//${window.location.host}`;

  socket = io(baseURL, {
    auth: { token },
    path: "/socket.io",
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getExistingSocket(): Socket | null {
  return socket;
}
