import { create } from "zustand";

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  role: string;
  content: string;
  room: string;
  createdAt: string;
}

interface ChatState {
  messages: Record<string, ChatMessage[]>;
  unreadCount: number;
  isOpen: boolean;
  activeRoom: string;

  addMessage: (msg: ChatMessage) => void;
  setHistory: (room: string, messages: ChatMessage[]) => void;
  markRead: () => void;
  setOpen: (open: boolean) => void;
  setActiveRoom: (room: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: {},
  unreadCount: 0,
  isOpen: false,
  activeRoom: "global",

  addMessage: (msg) =>
    set((s) => {
      const roomMsgs = s.messages[msg.room] ?? [];
      const alreadyExists = roomMsgs.some((m) => m.id === msg.id);
      if (alreadyExists) return s;

      return {
        messages: {
          ...s.messages,
          [msg.room]: [...roomMsgs, msg].slice(-200), // keep last 200
        },
        unreadCount: s.isOpen && s.activeRoom === msg.room
          ? s.unreadCount
          : s.unreadCount + 1,
      };
    }),

  setHistory: (room, messages) =>
    set((s) => ({
      messages: { ...s.messages, [room]: messages },
    })),

  markRead: () => set({ unreadCount: 0 }),

  setOpen: (open) => set({ isOpen: open, unreadCount: open ? 0 : 0 }),

  setActiveRoom: (room) => set({ activeRoom: room }),
}));
