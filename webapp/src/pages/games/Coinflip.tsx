import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCoinflip, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import type { GameResult } from "@/hooks/useGameApi";

const QUICK_BETS = [0.1, 1, 5, 25];

const Coinflip = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [choice, setChoice] = useState<"heads" | "tails">("heads");
  const [result, setResult] = useState<GameResult | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showSeeds, setShowSeeds] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: flip, isPending } = useCoinflip();
  const { data: history } = useGameHistory("coinflip");

  const handlePlay = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setAnimating(true);
    setResult(null);
    try {
      const res = await flip({ amount: amt, choice });
      setTimeout(() => {
        setResult(res);
        setAnimating(false);
      }, 1200);
    } catch {
      setAnimating(false);
    }
  };

  const coinResult = (result?.gameData as { result?: string })?.result;
  const isWin = result?.outcome === "win";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <Link to="/lobby">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-2xl">🪙</span>
            <div>
              <h1 className="text-xl font-bold text-white">Coinflip</h1>
              <p className="text-xs text-gray-500">1% house edge · 1.98x payout</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
            {/* Game area */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-6"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Coin */}
              <div className="relative h-40 w-40 flex items-center justify-center">
                <AnimatePresence mode="wait">
                  {animating ? (
                    <motion.div
                      key="spinning"
                      className="absolute inset-0 rounded-full flex items-center justify-center text-4xl"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
                      animate={{ rotateY: [0, 360, 720, 1080] }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    >
                      🪙
                    </motion.div>
                  ) : result ? (
                    <motion.div
                      key="result"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="absolute inset-0 rounded-full flex flex-col items-center justify-center"
                      style={{
                        background: isWin
                          ? "linear-gradient(135deg, #10b981, #059669)"
                          : "linear-gradient(135deg, #ef4444, #dc2626)",
                        boxShadow: isWin ? "0 0 40px rgba(16,185,129,0.4)" : "0 0 40px rgba(239,68,68,0.4)",
                      }}
                    >
                      <span className="text-3xl">{coinResult === "heads" ? "👑" : "🦅"}</span>
                      <span className="text-sm font-bold text-white capitalize mt-1">{coinResult}</span>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="idle"
                      className="absolute inset-0 rounded-full flex items-center justify-center text-5xl"
                      style={{
                        background: "rgba(245,158,11,0.1)",
                        border: "2px solid rgba(245,158,11,0.3)",
                      }}
                    >
                      🪙
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Result banner */}
              <AnimatePresence>
                {result && !animating && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{ color: isWin ? "#10b981" : "#ef4444" }}
                    >
                      {isWin ? `+$${result.payout.toFixed(2)}` : `-$${parseFloat(amount).toFixed(2)}`}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {isWin ? `${result.multiplier}x multiplier` : "No win this round"}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Choice selector */}
              <div className="flex gap-3 w-full max-w-xs">
                {(["heads", "tails"] as const).map((side) => (
                  <button
                    key={side}
                    onClick={() => setChoice(side)}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm capitalize transition-all"
                    style={{
                      background: choice === side ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                      border: `2px solid ${choice === side ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                      color: choice === side ? "#f59e0b" : "#9ca3af",
                    }}
                  >
                    {side === "heads" ? "👑 Heads" : "🦅 Tails"}
                  </button>
                ))}
              </div>

              {/* Provably fair */}
              {result && (
                <button
                  onClick={() => setShowSeeds(!showSeeds)}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  {showSeeds ? "Hide" : "Show"} provably fair data
                </button>
              )}
              {showSeeds && result && (
                <div
                  className="w-full rounded-lg p-3 text-xs font-mono break-all space-y-1"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.1)" }}
                >
                  <div><span className="text-gray-500">Server Seed: </span><span className="text-gray-300">{result.provablyFair.serverSeed}</span></div>
                  <div><span className="text-gray-500">Client Seed: </span><span className="text-gray-300">{result.provablyFair.clientSeed}</span></div>
                  <div><span className="text-gray-500">Nonce: </span><span className="text-gray-300">{result.provablyFair.nonce}</span></div>
                  <div><span className="text-gray-500">Hash: </span><span className="text-gray-300">{result.provablyFair.serverSeedHash}</span></div>
                </div>
              )}
            </div>

            {/* Controls panel */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Place Bet</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount (USDC)</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0.01"
                      max="1000"
                      step="0.01"
                      className="bg-black/30 border-white/10 text-white"
                      placeholder="0.00"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {QUICK_BETS.map((q) => (
                        <button
                          key={q}
                          onClick={() => setAmount(String(q))}
                          className="flex-1 py-1 text-xs rounded-md transition-colors"
                          style={{
                            background: "rgba(245,158,11,0.08)",
                            border: "1px solid rgba(245,158,11,0.15)",
                            color: "#f59e0b",
                          }}
                        >
                          ${q}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Balance</span>
                    <span className="text-white">${user?.balance.toFixed(2) ?? "0.00"}</span>
                  </div>

                  <Button
                    onClick={handlePlay}
                    disabled={isPending || animating || !user}
                    className="w-full h-11 font-semibold"
                    style={{
                      background: "linear-gradient(135deg, #f59e0b, #d97706)",
                      color: "#0a0a0f",
                    }}
                  >
                    {isPending || animating ? "Flipping..." : `Flip ${choice === "heads" ? "👑" : "🦅"}`}
                  </Button>
                </div>
              </div>

              {/* History */}
              <div
                className="rounded-2xl p-5 flex-1"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Bets</h3>
                <div className="space-y-2">
                  {(history?.bets ?? []).slice(0, 8).map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-500">${b.amount.toFixed(2)}</span>
                      <span
                        className={cn("font-semibold", b.outcome === "win" ? "text-green-400" : "text-red-400")}
                      >
                        {b.outcome === "win" ? `+$${b.payout?.toFixed(2)}` : `-$${b.amount.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  {(!history?.bets || history.bets.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-4">No bets yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Coinflip;
