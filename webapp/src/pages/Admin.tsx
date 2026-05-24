import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Users,
  BarChart3,
  Gamepad2,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Crown,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

// ---- Types ----

interface AdminStats {
  totalUsers: number;
  totalBets: number;
  houseBalance: number;
  totalWagered: number;
  recentBets: RecentBet[];
}

interface RecentBet {
  id: string;
  username: string;
  game: string;
  amount: number;
  outcome: "win" | "loss";
  payout: number;
  createdAt: string;
}

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  balance: number;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AdminUsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

interface GameSession {
  id: string;
  gameType: string;
  status: "active" | "completed" | "cancelled";
  betCount: number;
  houseEdge: number;
  createdAt: string;
}

// ---- Helpers ----

const formatCurrency = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

function roleBadge(role: string) {
  if (role === "admin") return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">ADMIN</Badge>;
  if (role === "vip") return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">VIP</Badge>;
  return <Badge className="bg-gray-700/60 text-gray-400 border-gray-600/30 text-[10px]">USER</Badge>;
}

function statusBadge(active: boolean) {
  return active
    ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px] gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Active</Badge>
    : <Badge className="bg-red-500/15 text-red-400 border-red-500/25 text-[10px] gap-1"><XCircle className="h-2.5 w-2.5" />Banned</Badge>;
}

function sessionStatusBadge(status: string) {
  if (status === "active") return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25 text-[10px]">Active</Badge>;
  if (status === "completed") return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25 text-[10px]">Completed</Badge>;
  return <Badge className="bg-gray-700/60 text-gray-400 border-gray-600/30 text-[10px]">Cancelled</Badge>;
}

// ---- Stat Card ----

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}

const StatCard = ({ icon, label, value, accent }: StatCardProps) => (
  <div
    className="rounded-xl p-4 flex flex-col gap-2"
    style={{ background: "#0d0d1a", border: `1px solid ${accent}22` }}
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</span>
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold font-display" style={{ color: accent }}>{value}</p>
  </div>
);

// ---- Overview Tab ----

const OverviewTab = ({ stats }: { stats: AdminStats }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard icon={<Users className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />} label="Total Users" value={stats.totalUsers.toLocaleString()} accent="#6366f1" />
      <StatCard icon={<BarChart3 className="h-3.5 w-3.5" style={{ color: "#f59e0b" }} />} label="Total Bets" value={stats.totalBets.toLocaleString()} accent="#f59e0b" />
      <StatCard icon={<DollarSign className="h-3.5 w-3.5" style={{ color: "#10b981" }} />} label="House Balance" value={formatCurrency(stats.houseBalance)} accent="#10b981" />
      <StatCard icon={<TrendingUp className="h-3.5 w-3.5" style={{ color: "#8b5cf6" }} />} label="Total Wagered" value={formatCurrency(stats.totalWagered)} accent="#8b5cf6" />
    </div>

    <div className="rounded-xl overflow-hidden" style={{ background: "#0d0d1a", border: "1px solid rgba(99,102,241,0.15)" }}>
      <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(99,102,241,0.12)" }}>
        <h3 className="text-sm font-semibold text-white">Recent Bets</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {["Username", "Game", "Amount", "Outcome", "Payout", "Time"].map((h) => (
                <th key={h} className="text-left px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stats.recentBets.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600 text-sm">No bets yet</td></tr>
            ) : stats.recentBets.map((bet) => (
              <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td className="px-5 py-3 text-white font-medium text-xs">{bet.username}</td>
                <td className="px-5 py-3 text-gray-400 text-xs capitalize">{bet.game}</td>
                <td className="px-5 py-3 text-white text-xs font-mono">{formatCurrency(bet.amount)}</td>
                <td className="px-5 py-3">
                  {bet.outcome === "win"
                    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">WIN</span>
                    : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">LOSS</span>}
                </td>
                <td className="px-5 py-3 text-white text-xs font-mono">{formatCurrency(bet.payout)}</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{formatTime(bet.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ---- Users Tab ----

const UsersTab = () => {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const authOpts: RequestInit = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      return api.get<AdminUsersResponse>(`/api/admin/users?${params.toString()}`, authOpts);
    },
    enabled: !!token,
  });

  const makeVip = useMutation({
    mutationFn: (id: string) => api.put<AdminUser>(`/api/admin/users/${id}`, { role: "vip" }, authOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User promoted to VIP");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleBan = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.put<AdminUser>(`/api/admin/users/${id}`, { isActive }, authOpts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="pl-8 h-8 text-sm text-white placeholder:text-gray-600"
          style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(99,102,241,0.2)" }}
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#0d0d1a", border: "1px solid rgba(99,102,241,0.15)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Username", "Email", "Balance", "Role", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-20" style={{ background: "rgba(255,255,255,0.05)" }} /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-600 text-sm">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td className="px-5 py-3 text-white font-medium text-xs">{u.username}</td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{u.email ?? "—"}</td>
                  <td className="px-5 py-3 text-white text-xs font-mono">{formatCurrency(u.balance)}</td>
                  <td className="px-5 py-3">{roleBadge(u.role)}</td>
                  <td className="px-5 py-3">{statusBadge(u.isActive)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {u.role !== "vip" && u.role !== "admin" && (
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] gap-1"
                          style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)" }}
                          onClick={() => makeVip.mutate(u.id)}
                          disabled={makeVip.isPending}
                        >
                          <Crown className="h-2.5 w-2.5" />
                          VIP
                        </Button>
                      )}
                      {u.role !== "admin" && (
                        <Button
                          size="sm"
                          className={cn("h-6 px-2 text-[10px]")}
                          style={u.isActive
                            ? { background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }
                            : { background: "rgba(16,185,129,0.12)", color: "#34d399", border: "1px solid rgba(16,185,129,0.2)" }}
                          onClick={() => toggleBan.mutate({ id: u.id, isActive: !u.isActive })}
                          disabled={toggleBan.isPending}
                        >
                          {u.isActive ? "Ban" : "Unban"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-xs text-gray-500">{total} users total</span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-gray-400 hover:text-white"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-400">Page {page} of {totalPages}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-gray-400 hover:text-white"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Games Tab ----

const GamesTab = () => {
  const token = useAuthStore((s) => s.token);
  const authOpts: RequestInit = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-games"],
    queryFn: () => api.get<GameSession[]>("/api/admin/games", authOpts),
    enabled: !!token,
  });

  const sessions = data ?? [];

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0d0d1a", border: "1px solid rgba(99,102,241,0.15)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {["Game Type", "Status", "Bets", "House Edge", "Time"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-5 py-3"><Skeleton className="h-4 w-16" style={{ background: "rgba(255,255,255,0.05)" }} /></td>
                  ))}
                </tr>
              ))
            ) : sessions.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-gray-600 text-sm">No game sessions yet</td></tr>
            ) : sessions.map((s) => (
              <tr key={s.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <td className="px-5 py-3 text-white font-medium text-xs capitalize">{s.gameType}</td>
                <td className="px-5 py-3">{sessionStatusBadge(s.status)}</td>
                <td className="px-5 py-3 text-gray-300 text-xs">{s.betCount}</td>
                <td className="px-5 py-3 text-gray-300 text-xs">{(s.houseEdge * 100).toFixed(1)}%</td>
                <td className="px-5 py-3 text-gray-500 text-xs">{formatTime(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---- Main Admin Page ----

const MOCK_STATS: AdminStats = {
  totalUsers: 1247,
  totalBets: 48392,
  houseBalance: 284750.0,
  totalWagered: 1920450.0,
  recentBets: [
    { id: "1", username: "CryptoKing", game: "crash", amount: 250, outcome: "win", payout: 625, createdAt: new Date(Date.now() - 60000).toISOString() },
    { id: "2", username: "LuckyAce", game: "roulette", amount: 100, outcome: "loss", payout: 0, createdAt: new Date(Date.now() - 120000).toISOString() },
    { id: "3", username: "Viper77", game: "coinflip", amount: 50, outcome: "win", payout: 97.5, createdAt: new Date(Date.now() - 200000).toISOString() },
    { id: "4", username: "Maverick", game: "mines", amount: 200, outcome: "loss", payout: 0, createdAt: new Date(Date.now() - 350000).toISOString() },
    { id: "5", username: "ZeroCool", game: "slots", amount: 75, outcome: "win", payout: 300, createdAt: new Date(Date.now() - 500000).toISOString() },
  ],
};

const Admin = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const isAdmin = user?.role === "admin";

  const authOpts: RequestInit = { headers: token ? { Authorization: `Bearer ${token}` } : {} };

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      try {
        return await api.get<AdminStats>("/api/admin/stats", authOpts);
      } catch {
        return MOCK_STATS;
      }
    },
    enabled: !!token && isAdmin,
  });

  // Redirect non-admins (after all hooks)
  if (user && !isAdmin) {
    navigate("/lobby", { replace: true });
    return null;
  }

  const displayStats = stats ?? MOCK_STATS;

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      <div className="max-w-7xl mx-auto px-4 py-6 md:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
            >
              <ShieldCheck className="h-5 w-5" style={{ color: "#6366f1" }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white font-display">Admin Dashboard</h1>
              <p className="text-xs text-gray-500">Vibecode Casino Control Panel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 live-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview">
          <TabsList
            className="h-10 p-1 mb-6"
            style={{ background: "#0d0d1a", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            {["overview", "users", "games"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="capitalize px-5 text-sm data-[state=active]:text-white data-[state=inactive]:text-gray-500"
                style={{ "--tw-ring-color": "transparent" } as React.CSSProperties}
              >
                {tab === "overview" && <BarChart3 className="h-3.5 w-3.5 mr-1.5" />}
                {tab === "users" && <Users className="h-3.5 w-3.5 mr-1.5" />}
                {tab === "games" && <Gamepad2 className="h-3.5 w-3.5 mr-1.5" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            {statsLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            ) : (
              <OverviewTab stats={displayStats} />
            )}
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="games">
            <GamesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
