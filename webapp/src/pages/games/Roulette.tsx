import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRoulette, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import type { GameResult } from "@/hooks/useGameApi";

type BetType = "straight" | "red" | "black" | "odd" | "even" | "high" | "low" | "column" | "dozen";

interface ActiveBet {
  id: string;
  type: BetType;
  value: number;
  numbers?: number[];
  label: string;
  selection?: number; // column/dozen identifier (1|2|3)
}

const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

const numberColor = (n: number) =>
  n === 0 ? "green" : RED_NUMBERS.has(n) ? "red" : "black";

const Roulette = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chipValue, setChipValue] = useState(1);
  const [activeBets, setActiveBets] = useState<ActiveBet[]>([]);
  const [result, setResult] = useState<GameResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [showSeeds, setShowSeeds] = useState(false);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: spin, isPending } = useRoulette();
  const { data: history } = useGameHistory("roulette");

  const addBet = (type: BetType, label: string, numbers?: number[], selection?: number) => {
    const id = `${type}-${label}-${Date.now()}`;
    setActiveBets((prev) => [...prev, { id, type, value: chipValue, label, numbers, selection }]);
  };

  const removeBet = (id: string) => setActiveBets((prev) => prev.filter((b) => b.id !== id));

  const totalBet = activeBets.reduce((s, b) => s + b.value, 0);

  const handleSpin = async () => {
    if (activeBets.length === 0 || totalBet <= 0) return;
    setSpinning(true);
    setResult(null);
    try {
      const bets = activeBets.map((b) => ({
        type: b.type,
        value: b.value,
        numbers: b.numbers,
        selection: b.selection,
      }));
      const res = await spin({ amount: totalBet, bets });
      setTimeout(() => {
        setSpinning(false);
        setResult(res);
        if (res.outcome === "win") {
          setActiveBets([]);
        }
      }, 800);
    } catch {
      setSpinning(false);
    }
  };

  const spinResult = result?.gameData as { number?: number; color?: string } | undefined;
  const isWin = result?.outcome === "win";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/lobby">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-2xl">🎡</span>
            <div>
              <h1 className="text-xl font-bold text-white">Roulette</h1>
              <p className="text-xs text-gray-500">European · 2.7% house edge</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-6xl">
            {/* Betting table */}
            <div
              className="rounded-2xl p-4 md:p-6"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Result display */}
              <AnimatePresence>
                {result && !spinning && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 p-4 rounded-xl text-center"
                    style={{
                      background: isWin ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                      border: `1px solid ${isWin ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                    }}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                        style={{
                          background: spinResult?.color === "green" ? "#10b981" : spinResult?.color === "red" ? "#ef4444" : "#1f2937",
                        }}
                      >
                        {spinResult?.number}
                      </div>
                      <div>
                        <div
                          className="font-bold text-lg"
                          style={{ color: isWin ? "#10b981" : "#ef4444" }}
                        >
                          {isWin ? `+$${result.payout.toFixed(2)}` : `-$${totalBet.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {spinResult?.color} · {spinResult?.number}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spinning indicator */}
              {spinning && (
                <div className="mb-4 p-3 rounded-xl text-center text-amber-400 font-semibold text-sm"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  🎡 Spinning the wheel...
                </div>
              )}

              {/* Number grid */}
              <div className="mb-4">
                {/* Zero */}
                <div className="flex mb-1">
                  <button
                    onClick={() => addBet("straight", "0", [0])}
                    className="h-8 flex-1 rounded-lg text-xs font-bold text-white transition-all hover:brightness-125"
                    style={{ background: "#10b981", border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    0
                  </button>
                </div>

                {/* Numbers 1-36 in 3 columns × 12 rows */}
                <div className="grid grid-cols-3 gap-1">
                  {Array.from({ length: 36 }, (_, i) => i + 1).map((n) => {
                    const color = numberColor(n);
                    return (
                      <button
                        key={n}
                        onClick={() => addBet("straight", String(n), [n])}
                        className="h-8 rounded-lg text-xs font-bold text-white transition-all hover:brightness-125 hover:scale-105"
                        style={{
                          background: color === "red" ? "rgba(239,68,68,0.7)" : "rgba(30,30,46,0.8)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Outside bets */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { type: "low" as BetType, label: "1-18" },
                  { type: "even" as BetType, label: "Even" },
                  { type: "red" as BetType, label: "🔴 Red" },
                  { type: "black" as BetType, label: "⚫ Black" },
                  { type: "odd" as BetType, label: "Odd" },
                  { type: "high" as BetType, label: "19-36" },
                ].map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => addBet(type, label)}
                    className="py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all hover:brightness-110"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Dozens & Columns */}
              <div className="grid grid-cols-3 gap-2">
                {["1st 12", "2nd 12", "3rd 12"].map((label, i) => (
                  <button
                    key={label}
                    onClick={() => addBet("dozen", label, undefined, i + 1)}
                    className="py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-4">
              {/* Chip selector */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Chip Value</h3>
                <div className="flex gap-2 flex-wrap mb-4">
                  {[0.1, 0.5, 1, 5, 10, 25].map((v) => (
                    <button
                      key={v}
                      onClick={() => setChipValue(v)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: chipValue === v ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${chipValue === v ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                        color: chipValue === v ? "#f59e0b" : "#9ca3af",
                      }}
                    >
                      ${v}
                    </button>
                  ))}
                </div>

                {/* Active bets */}
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Active Bets</h3>
                {activeBets.length === 0 ? (
                  <p className="text-xs text-gray-600 py-2">Click the grid to add bets</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto mb-3">
                    {activeBets.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-xs">
                        <span className="text-gray-400">{b.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white">${b.value}</span>
                          <button onClick={() => removeBet(b.id)} className="text-gray-600 hover:text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between text-xs text-gray-500 mb-3">
                  <span>Total bet</span>
                  <span className="text-white font-semibold">${totalBet.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-4">
                  <span>Balance</span>
                  <span className="text-white">${user?.balance.toFixed(2) ?? "0.00"}</span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveBets([])}
                    className="flex-1 text-xs border-white/10"
                    disabled={activeBets.length === 0}
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleSpin}
                    disabled={isPending || spinning || activeBets.length === 0 || !user}
                    className="flex-1 h-9 font-semibold text-sm"
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
                  >
                    {spinning ? "Spinning..." : "Spin"}
                  </Button>
                </div>
              </div>

              {/* History */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Spins</h3>
                <div className="space-y-2">
                  {(history?.bets ?? []).slice(0, 6).map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-500">${b.amount.toFixed(2)}</span>
                      <span className={cn("font-semibold", b.outcome === "win" ? "text-green-400" : "text-red-400")}>
                        {b.outcome === "win" ? `+$${b.payout?.toFixed(2)}` : `-$${b.amount.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  {(!history?.bets || history.bets.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-4">No spins yet</p>
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

export default Roulette;
