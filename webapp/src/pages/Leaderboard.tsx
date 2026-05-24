import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Trophy, TrendingUp, Coins, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ---- Types ----

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  amount: number;
}

// ---- Constants ----

const PERIODS = [
  { label: "All Time", value: "all" },
  { label: "This Month", value: "month" },
  { label: "This Week", value: "week" },
];

const MOCK_WINNERS: LeaderboardEntry[] = [
  { rank: 1, userId: "1", username: "CryptoKing", amount: 284500 },
  { rank: 2, userId: "2", username: "LuckyAce", amount: 176300 },
  { rank: 3, userId: "3", username: "Viper77", amount: 142800 },
  { rank: 4, userId: "4", username: "Maverick", amount: 98400 },
  { rank: 5, userId: "5", username: "ZeroCool", amount: 87200 },
  { rank: 6, userId: "6", username: "Nightfall", amount: 61500 },
  { rank: 7, userId: "7", username: "Spectre", amount: 44100 },
  { rank: 8, userId: "8", username: "Phantom", amount: 38700 },
  { rank: 9, userId: "9", username: "Oracle", amount: 27600 },
  { rank: 10, userId: "10", username: "Shadow", amount: 19200 },
];

const MOCK_WAGERERS: LeaderboardEntry[] = [
  { rank: 1, userId: "1", username: "HighRoller", amount: 1840000 },
  { rank: 2, userId: "2", username: "BetKing99", amount: 1420000 },
  { rank: 3, userId: "3", username: "CryptoKing", amount: 980000 },
  { rank: 4, userId: "4", username: "WhaleDude", amount: 756000 },
  { rank: 5, userId: "5", username: "DegenMaster", amount: 601000 },
  { rank: 6, userId: "6", username: "LuckyAce", amount: 498000 },
  { rank: 7, userId: "7", username: "Maverick", amount: 375000 },
  { rank: 8, userId: "8", username: "GamblerX", amount: 284000 },
  { rank: 9, userId: "9", username: "Viper77", amount: 201000 },
  { rank: 10, userId: "10", username: "NightOwl", amount: 168000 },
];

// ---- Helpers ----

const formatAmount = (n: number) => {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(1) + "K";
  return "$" + n.toLocaleString();
};

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const ROW_STYLES: Record<number, { bg: string; border: string }> = {
  1: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  2: { bg: "rgba(156,163,175,0.06)", border: "rgba(156,163,175,0.15)" },
  3: { bg: "rgba(180,83,9,0.07)", border: "rgba(180,83,9,0.15)" },
};

// ---- Row ----

const LeaderboardRow = ({ entry }: { entry: LeaderboardEntry }) => {
  const medal = RANK_MEDALS[entry.rank];
  const rowStyle = ROW_STYLES[entry.rank];
  const initial = entry.username[0]?.toUpperCase() ?? "?";

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
        entry.rank <= 3 ? "border" : "hover:bg-white/[0.02]"
      )}
      style={rowStyle ? { background: rowStyle.bg, borderColor: rowStyle.border } : {}}
    >
      {/* Rank */}
      <div className="w-7 text-center flex-shrink-0">
        {medal ? (
          <span className="text-lg">{medal}</span>
        ) : (
          <span className="text-xs font-bold text-gray-500">#{entry.rank}</span>
        )}
      </div>

      {/* Avatar + username */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}
      >
        {initial}
      </div>
      <span className="flex-1 text-sm font-medium text-white truncate">{entry.username}</span>

      {/* Amount */}
      <span
        className="text-sm font-bold font-mono"
        style={{ color: entry.rank === 1 ? "#f59e0b" : entry.rank === 2 ? "#9ca3af" : entry.rank === 3 ? "#b45309" : "#e5e7eb" }}
      >
        {formatAmount(entry.amount)}
      </span>
    </div>
  );
};

// ---- Skeleton Rows ----

const SkeletonRows = () => (
  <div className="space-y-1.5">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-7 h-4 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
        <Skeleton className="w-8 h-8 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
        <Skeleton className="flex-1 h-4 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
        <Skeleton className="w-14 h-4 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    ))}
  </div>
);

// ---- Leaderboard Panel ----

interface PanelProps {
  title: string;
  icon: React.ReactNode;
  accentColor: string;
  entries: LeaderboardEntry[] | undefined;
  isLoading: boolean;
}

const LeaderboardPanel = ({ title, icon, accentColor, entries, isLoading }: PanelProps) => {
  const rows = entries && entries.length > 0 ? entries : [];

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "#0d0d1a", border: `1px solid ${accentColor}20` }}
    >
      {/* Panel header */}
      <div
        className="flex items-center gap-2.5 px-5 py-4"
        style={{ borderBottom: `1px solid ${accentColor}18` }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}
        >
          {icon}
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>

      {/* Rows */}
      <div className="p-3 flex-1">
        {isLoading ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <Trophy className="h-10 w-10 mb-3 opacity-20" />
            <p className="text-sm">No data yet</p>
            <p className="text-xs mt-1 opacity-60">Be the first on the board!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rows.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Main Page ----

const Leaderboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get("period") ?? "all";

  const { data: winners, isLoading: winnersLoading } = useQuery({
    queryKey: ["leaderboard-winners", period],
    queryFn: async () => {
      try {
        return await api.get<LeaderboardEntry[]>(`/api/leaderboard/top-winners?period=${period}`);
      } catch {
        return MOCK_WINNERS;
      }
    },
  });

  const { data: wagerers, isLoading: wagerersLoading } = useQuery({
    queryKey: ["leaderboard-wagerers", period],
    queryFn: async () => {
      try {
        return await api.get<LeaderboardEntry[]>(`/api/leaderboard/top-wagered?period=${period}`);
      } catch {
        return MOCK_WAGERERS;
      }
    },
  });

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Hero */}
      <div
        className="relative py-12 px-4 text-center overflow-hidden"
        style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 60% at 50% -10%, rgba(245,158,11,0.1) 0%, transparent 70%)",
          }}
        />
        <div className="relative">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
          >
            <Trophy className="h-7 w-7" style={{ color: "#f59e0b" }} />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-2">Leaderboard</h1>
          <p className="text-gray-500 text-sm">
            The best players at Vibecode Casino — ranked by winnings and total wagered.
          </p>

          {/* Period tabs */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setSearchParams({ period: p.value })}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-semibold transition-all",
                  period === p.value
                    ? "text-white"
                    : "text-gray-500 hover:text-gray-300"
                )}
                style={
                  period === p.value
                    ? { background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#f59e0b" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Panels */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LeaderboardPanel
            title="Top Winners"
            icon={<Crown className="h-4 w-4" style={{ color: "#f59e0b" }} />}
            accentColor="#f59e0b"
            entries={winners}
            isLoading={winnersLoading}
          />
          <LeaderboardPanel
            title="Top Wagerers"
            icon={<TrendingUp className="h-4 w-4" style={{ color: "#8b5cf6" }} />}
            accentColor="#8b5cf6"
            entries={wagerers}
            isLoading={wagerersLoading}
          />
        </div>

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 mt-8 text-xs text-gray-600">
          <Coins className="h-3.5 w-3.5" />
          <span>Leaderboard updates every 5 minutes. All amounts in USD.</span>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
