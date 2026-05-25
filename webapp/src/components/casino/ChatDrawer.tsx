import { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChatStore } from "@/stores/useChatStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocket } from "@/hooks/useSocket";
import { cn } from "@/lib/utils";

const ROOMS = [
  { id: "global", label: "Global" },
  { id: "crash", label: "Crash" },
  { id: "roulette", label: "Roulette" },
  { id: "jackpot", label: "Jackpot" },
];

const roleColor: Record<string, string> = {
  admin: "#f59e0b",
  mod: "#10b981",
  user: "#9ca3af",
};

export function ChatDrawer() {
  const { isOpen, setOpen, activeRoom, setActiveRoom, messages, markRead, unreadCount } = useChatStore();
  const { socket } = useSocket();
  const user = useAuthStore((s) => s.user);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const roomMessages = messages[activeRoom] ?? [];

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      markRead();
    }
  }, [roomMessages.length, isOpen, markRead]);

  // Join room when switching
  useEffect(() => {
    if (!socket || !isOpen) return;
    socket.emit("chat:join", { room: activeRoom });
  }, [socket, activeRoom, isOpen]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || !socket) return;
    socket.emit("chat:send", { content, room: activeRoom });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
        title="Chat"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ background: "#ef4444", color: "white", fontSize: "10px" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-80 md:w-72"
              style={{
                background: "#0d0d14",
                borderLeft: "1px solid rgba(245,158,11,0.15)",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" style={{ color: "#f59e0b" }} />
                  <span className="text-sm font-semibold text-white">Chat</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Room tabs */}
              <div
                className="flex gap-1 px-3 py-2 shrink-0 overflow-x-auto"
                style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}
              >
                {ROOMS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoom(r.id)}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap shrink-0",
                      activeRoom === r.id
                        ? "text-amber-400"
                        : "text-gray-500 hover:text-gray-300"
                    )}
                    style={
                      activeRoom === r.id
                        ? { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)" }
                        : { border: "1px solid transparent" }
                    }
                  >
                    <Hash className="h-3 w-3" />
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
                {roomMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="h-8 w-8 text-gray-700 mb-2" />
                    <p className="text-xs text-gray-600">No messages yet.</p>
                    <p className="text-xs text-gray-700">Be the first to say something!</p>
                  </div>
                ) : (
                  roomMessages.map((msg) => {
                    const isOwn = msg.userId === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex gap-2", isOwn && "flex-row-reverse")}>
                        {/* Avatar */}
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          style={{
                            background: isOwn
                              ? "linear-gradient(135deg, #f59e0b44, #d9770644)"
                              : "rgba(255,255,255,0.08)",
                            color: isOwn ? "#f59e0b" : "#9ca3af",
                          }}
                        >
                          {msg.username[0]?.toUpperCase()}
                        </div>

                        {/* Bubble */}
                        <div className={cn("flex flex-col max-w-[200px]", isOwn && "items-end")}>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span
                              className="text-xs font-semibold"
                              style={{ color: roleColor[msg.role] ?? "#9ca3af" }}
                            >
                              {isOwn ? "You" : msg.username}
                            </span>
                            <span className="text-xs text-gray-700">{formatTime(msg.createdAt)}</span>
                          </div>
                          <div
                            className="px-2.5 py-1.5 rounded-xl text-xs text-gray-200 break-words"
                            style={{
                              background: isOwn
                                ? "rgba(245,158,11,0.15)"
                                : "rgba(255,255,255,0.06)",
                              border: isOwn
                                ? "1px solid rgba(245,158,11,0.2)"
                                : "1px solid rgba(255,255,255,0.08)",
                            }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div
                className="px-3 py-3 shrink-0"
                style={{ borderTop: "1px solid rgba(245,158,11,0.1)" }}
              >
                {user ? (
                  <div className="flex gap-2">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Say something…"
                      maxLength={200}
                      className="flex-1 bg-black/30 border-white/10 text-white text-xs h-9"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || !socket}
                      size="sm"
                      className="h-9 px-3 shrink-0"
                      style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 text-center py-1">Sign in to chat</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatDrawer;
