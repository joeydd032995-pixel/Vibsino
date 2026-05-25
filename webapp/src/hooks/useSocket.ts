import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/useAuthStore";

export function useSocket() {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const s = getSocket(token);
    socketRef.current = s;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    if (s.connected) setConnected(true);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [token]);

  useEffect(() => {
    // Disconnect socket when user logs out
    if (!token) {
      disconnectSocket();
      setConnected(false);
      socketRef.current = null;
    }
  }, [token]);

  return { socket: socketRef.current, connected };
}
