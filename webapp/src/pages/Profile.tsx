import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, TrendingUp, Zap, DollarSign, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import { useAuthStore } from "@/stores/useAuthStore";

interface BetRecord {
  id: string;
  game: string;
  amount: number;
  result: "win" | "loss";
  payout: number;
  multiplier: string;
  time: string;
}

const MOCK_HISTORY: BetRecord[] = [
  { id: "1", game: "Crash", amount: 50, result: "win", payout: 120.5, multiplier: "2.41x", time: "2 min ago" },
  { id: "2", game: "Coinflip", amount: 100, result: "loss", payout: 0, multiplier: "2x", time: "5 min ago" },
  { id: "3", game: "Roulette", amount: 25, result: "win", payout: 875, multiplier: "35x", time: "12 min ago" },
  { id: "4", game: "Mines", amount: 75, result: "win", payout: 337.5, multiplier: "4.5x", time: "18 min ago" },
  { id: "5", game: "Slots", amount: 10, result: "loss", payout: 0, multiplier: "0x", time: "25 min ago" },
  { id: "6", game: "Crash", amount: 200, result: "win", payout: 760, multiplier: "3.8x", time: "32 min ago" },
  { id: "7", game: "Poker", amount: 50, result: "loss", payout: 0, multiplier: "0x", time: "45 min ago" },
  { id: "8", game: "Jackpot", amount: 30, result: "win", payout: 1200, multiplier: "40x", time: "1 hr ago" },
];

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) => (
  <div
    className="p-5 rounded-xl"
    style={{
      background: "rgba(13,13,20,0.8)",
      border: "1px solid rgba(245,158,11,0.1)",
    }}
  >
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
      style={{ background: `${color}22`, border: `1px solid ${color}33` }}
    >
      <Icon className="h-4.5 w-4.5" style={{ color }} />
    </div>
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className="text-xl font-bold text-white">{value}</p>
  </div>
);

const Profile = () => {
  const user = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);

  const wins = MOCK_HISTORY.filter((b) => b.result === "win").length;
  const winRate = Math.round((wins / MOCK_HISTORY.length) * 100);
  const totalWagered = MOCK_HISTORY.reduce((s, b) => s + b.amount, 0);
  const biggestWin = Math.max(...MOCK_HISTORY.filter((b) => b.result === "win").map((b) => b.payout));

  const handleCopy = () => {
    if (user?.walletAddress) {
      navigator.clipboard.writeText(user.walletAddress).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Generate avatar color from username
  const avatarColor = user?.username
    ? `hsl(${user.username.charCodeAt(0) * 15 % 360}, 70%, 50%)`
    : "#f59e0b";

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0a0a0f" }}>
      <Navbar />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8">
        {/* Back */}
        <Link
          to="/lobby"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Lobby
        </Link>

        {/* Profile header */}
        <div
          className="p-6 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
          style={{
            background: "rgba(13,13,20,0.8)",
            border: "1px solid rgba(245,158,11,0.15)",
          }}
        >
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold uppercase flex-shrink-0"
            style={{ background: `${avatarColor}33`, border: `2px solid ${avatarColor}55`, color: avatarColor }}
          >
            {user?.username?.[0] ?? "?"}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-white">{user?.username ?? "Anonymous"}</h1>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-medium uppercase tracking-wide"
                style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
              >
                {user?.role ?? "Player"}
              </span>
            </div>
            {user?.email && (
              <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
            )}
            <p className="text-xs text-gray-600 mt-1">
              Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Today"}
            </p>
          </div>

          {/* Balance */}
          <div
            className="px-5 py-3 rounded-xl text-right flex-shrink-0"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
          >
            <p className="text-xs text-gray-500 mb-0.5">Balance</p>
            <p className="font-display text-2xl font-bold" style={{ color: "#f59e0b" }}>
              ${(user?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Zap} label="Total Bets" value={MOCK_HISTORY.length.toString()} color="#6366f1" />
          <StatCard icon={TrendingUp} label="Win Rate" value={`${winRate}%`} color="#10b981" />
          <StatCard icon={Trophy} label="Biggest Win" value={`$${biggestWin.toLocaleString()}`} color="#f59e0b" />
          <StatCard icon={DollarSign} label="Total Wagered" value={`$${totalWagered.toLocaleString()}`} color="#ec4899" />
        </div>

        {/* Wallet section */}
        <div
          className="p-5 rounded-xl mb-6"
          style={{
            background: "rgba(13,13,20,0.8)",
            border: "1px solid rgba(245,158,11,0.1)",
          }}
        >
          <h2 className="text-sm font-semibold text-white mb-3">Wallet</h2>
          {user?.walletAddress ? (
            <div className="flex items-center gap-3">
              <div
                className="flex-1 px-3 py-2 rounded-lg font-mono text-sm text-gray-300"
                style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                {user.walletAddress}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="flex-shrink-0 gap-1"
                style={{ color: copied ? "#10b981" : "#f59e0b" }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">No wallet connected</p>
              <Link to="/auth">
                <Button
                  size="sm"
                  className="gap-2 text-xs"
                  style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}
                >
                  Connect Wallet
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Bet history */}
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background: "rgba(13,13,20,0.8)",
            border: "1px solid rgba(245,158,11,0.1)",
          }}
        >
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(245,158,11,0.08)" }}
          >
            <h2 className="text-sm font-semibold text-white">Recent Bets</h2>
            <span className="text-xs text-gray-500">{MOCK_HISTORY.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(245,158,11,0.06)" }}>
                  {["Game", "Bet", "Multiplier", "Payout", "Result", "Time"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_HISTORY.map((bet, i) => (
                  <tr
                    key={bet.id}
                    style={{
                      borderBottom: i < MOCK_HISTORY.length - 1 ? "1px solid rgba(245,158,11,0.04)" : "none",
                    }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{bet.game}</td>
                    <td className="px-4 py-3 text-gray-300">${bet.amount}</td>
                    <td className="px-4 py-3 text-gray-400">{bet.multiplier}</td>
                    <td className="px-4 py-3 font-semibold" style={{ color: bet.result === "win" ? "#10b981" : "#ef4444" }}>
                      {bet.result === "win" ? `+$${bet.payout.toFixed(2)}` : "-$" + bet.amount}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: bet.result === "win" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
                          color: bet.result === "win" ? "#10b981" : "#ef4444",
                        }}
                      >
                        {bet.result === "win" ? "Win" : "Loss"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{bet.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
