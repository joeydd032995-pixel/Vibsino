import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, TrendingUp, Zap, DollarSign, Copy, Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/useAuthStore";
import { useWalletAuth } from "@/hooks/useWalletAuth";

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
  const [connecting, setConnecting] = useState<string | null>(null);
  const { connectMetaMask, connectPhantom } = useWalletAuth();

  const handleConnectWallet = async (type: "metamask" | "phantom") => {
    setConnecting(type);
    try {
      if (type === "metamask") await connectMetaMask();
      else await connectPhantom();
      toast.success("Wallet connected successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error("Could not connect wallet", { description: msg });
    } finally {
      setConnecting(null);
    }
  };

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
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4" style={{ color: "#f59e0b" }} />
            <h2 className="text-sm font-semibold text-white">Wallet</h2>
          </div>
          {user?.walletAddress ? (
            <div className="space-y-2">
              {/* Chain badge */}
              {user.walletChain && (
                <span
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: user.walletChain === "solana" ? "rgba(99,102,241,0.15)" : "rgba(245,158,11,0.15)",
                    color: user.walletChain === "solana" ? "#818cf8" : "#f59e0b",
                    border: `1px solid ${user.walletChain === "solana" ? "rgba(99,102,241,0.3)" : "rgba(245,158,11,0.3)"}`,
                  }}
                >
                  {user.walletChain === "solana" ? "👻 Solana" : "🦊 Ethereum"}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className="flex-1 px-3 py-2 rounded-lg font-mono text-sm text-gray-300 truncate"
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
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">No wallet connected. Connect one to use crypto features.</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  disabled={connecting !== null}
                  onClick={() => handleConnectWallet("metamask")}
                  className="gap-2 text-xs h-8"
                  style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  {connecting === "metamask" ? (
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(245,158,11,0.3)", borderTopColor: "#f59e0b" }} />
                  ) : "🦊"}
                  {connecting === "metamask" ? "Connecting…" : "MetaMask"}
                </Button>
                <Button
                  size="sm"
                  disabled={connecting !== null}
                  onClick={() => handleConnectWallet("phantom")}
                  className="gap-2 text-xs h-8"
                  style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}
                >
                  {connecting === "phantom" ? (
                    <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(99,102,241,0.3)", borderTopColor: "#818cf8" }} />
                  ) : "👻"}
                  {connecting === "phantom" ? "Connecting…" : "Phantom"}
                </Button>
              </div>
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
