import { useState } from "react";
import { Bell, DollarSign, ArrowUpRight, Dice5, Info, Star, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "deposit" | "withdrawal" | "bet_result" | "system" | "promotion";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

const TYPE_CONFIG = {
  deposit: { icon: DollarSign, color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  withdrawal: { icon: ArrowUpRight, color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  bet_result: { icon: Dice5, color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  system: { icon: Info, color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  promotion: { icon: Star, color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "deposit",
    title: "Deposit Confirmed",
    message: "Your deposit of $500.00 USDC has been processed.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "2",
    type: "bet_result",
    title: "Big Win!",
    message: "You won $1,200 on Crash with a 2.4x multiplier.",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
  },
  {
    id: "3",
    type: "promotion",
    title: "Weekend Bonus",
    message: "Get a 20% deposit bonus this weekend only. Limited time!",
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: "4",
    type: "system",
    title: "New Game Available",
    message: "Plinko is now live! Try it out and earn double XP this week.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "5",
    type: "withdrawal",
    title: "Withdrawal Sent",
    message: "Your withdrawal of $250.00 has been sent to your wallet.",
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        return await api.get<NotificationsResponse>("/api/notifications", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      } catch {
        return { notifications: MOCK_NOTIFICATIONS, unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length };
      }
    },
    refetchInterval: 30000,
    enabled: !!token,
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      api.put("/api/notifications/read-all", undefined, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: (id: string) =>
      api.put(`/api/notifications/${id}/read`, undefined, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.notifications ?? MOCK_NOTIFICATIONS;
  const unreadCount = data?.unreadCount ?? MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-8 w-8 p-0 text-gray-400 hover:text-white"
          style={{ border: "1px solid rgba(245, 158, 11, 0.2)" }}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: "#ef4444" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 border-0"
        style={{
          background: "rgba(13, 13, 20, 0.97)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(245,158,11,0.2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid rgba(245,158,11,0.1)" }}
        >
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" style={{ color: "#f59e0b" }} />
            <span className="text-sm font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: "rgba(239,68,68,0.2)", color: "#ef4444" }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 text-gray-400 hover:text-white"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 p-2">
                  <Skeleton className="h-8 w-8 rounded-lg flex-shrink-0" style={{ background: "rgba(255,255,255,0.05)" }} />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-3/4" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <Skeleton className="h-3 w-full" style={{ background: "rgba(255,255,255,0.05)" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-600">
              <Bell className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                const Icon = config.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      if (!notif.read) markOneRead.mutate(notif.id);
                    }}
                    className={cn(
                      "w-full flex gap-3 p-3 rounded-lg text-left transition-colors hover:bg-white/[0.04]",
                      !notif.read && "bg-white/[0.03]"
                    )}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: config.bg, border: `1px solid ${config.color}33` }}
                    >
                      <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p
                          className={cn("text-xs font-semibold truncate", notif.read ? "text-gray-400" : "text-white")}
                        >
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1"
                            style={{ background: "#f59e0b" }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
