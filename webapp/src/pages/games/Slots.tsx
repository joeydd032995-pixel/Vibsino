import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSlots, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import type { GameResult } from "@/hooks/useGameApi";

const SYMBOL_MAP: Record<string, string> = {
  "7": "7️⃣",
  BAR: "📊",
  BELL: "🔔",
  GRAPE: "🍇",
  CHERRY: "🍒",
  ORANGE: "🍊",
  LEMON: "🍋",
};

const PAYTABLE = [
  { symbols: "7 7 7", multiplier: 100 },
  { symbols: "BAR BAR BAR", multiplier: 50 },
  { symbols: "🔔 🔔 🔔", multiplier: 25 },
  { symbols: "🍇 🍇 🍇", multiplier: 15 },
  { symbols: "🍒 🍒 🍒", multiplier: 10 },
  { symbols: "🍊 🍊 🍊", multiplier: 8 },
  { symbols: "🍋 🍋 🍋", multiplier: 6 },
  { symbols: "🍒 + any", multiplier: 2 },
];

const ALL_SYMBOLS = Object.keys(SYMBOL_MAP);

// Per-reel stop times (staggered)
const REEL_STOP_TIMES = [600, 1000, 1400];

const Slots = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState<GameResult | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState<string[]>(["CHERRY", "ORANGE", "LEMON"]);
  const [stoppedReels, setStoppedReels] = useState<boolean[]>([false, false, false]);
  const [showPaytable, setShowPaytable] = useState(false);
  const spinTimers = useRef<ReturnType<typeof setInterval>[]>([]);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: spin, isPending } = useSlots();
  const { data: history } = useGameHistory("slots");

  const handleSpin = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;

    setSpinning(true);
    setResult(null);
    setStoppedReels([false, false, false]);

    // Start spinning animation for all reels
    spinTimers.current.forEach(clearInterval);
    spinTimers.current = [];

    for (let r = 0; r < 3; r++) {
      const timer = setInterval(() => {
        setDisplayReels((prev) => {
          const next = [...prev];
          next[r] = ALL_SYMBOLS[Math.floor(Math.random() * ALL_SYMBOLS.length)] ?? "CHERRY";
          return next;
        });
      }, 70);
      spinTimers.current.push(timer);
    }

    try {
      const res = await spin({ amount: amt });
      const finalReels = (res.gameData as { reels?: string[] }).reels ?? ["LEMON", "LEMON", "LEMON"];

      // Stop reels with staggered timing + spring settle
      for (let r = 0; r < 3; r++) {
        setTimeout(() => {
          clearInterval(spinTimers.current[r]!);
          setDisplayReels((prev) => {
            const next = [...prev];
            next[r] = finalReels[r] ?? "LEMON";
            return next;
          });
          setStoppedReels((prev) => {
            const next = [...prev];
            next[r] = true;
            return next;
          });
          if (r === 2) {
            setSpinning(false);
            setResult(res);
          }
        }, REEL_STOP_TIMES[r]);
      }
    } catch {
      spinTimers.current.forEach(clearInterval);
      setSpinning(false);
      setStoppedReels([true, true, true]);
    }
  };

  useEffect(() => {
    return () => spinTimers.current.forEach(clearInterval);
  }, []);

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
            <span className="text-2xl">🎰</span>
            <div>
              <h1 className="text-xl font-bold text-white">Slots</h1>
              <p className="text-xs text-gray-500">3% house edge · Up to 100x on triple 7s</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
            {/* Slot machine */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-6"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Machine frame */}
              <motion.div
                className="w-full max-w-sm rounded-2xl p-6"
                animate={
                  isWin && !spinning
                    ? { boxShadow: ["0 0 20px rgba(245,158,11,0.15)", "0 0 40px rgba(245,158,11,0.4)", "0 0 20px rgba(245,158,11,0.15)"] }
                    : { boxShadow: "0 0 30px rgba(245,158,11,0.1)" }
                }
                transition={isWin ? { duration: 1.2, repeat: 2, ease: "easeInOut" } : {}}
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "2px solid rgba(245,158,11,0.3)",
                }}
              >
                {/* Reels */}
                <div className="flex gap-3 justify-center mb-4">
                  {displayReels.map((symbol, i) => {
                    const isStopped = stoppedReels[i];
                    const showWinGlow = isWin && !spinning && isStopped;

                    return (
                      <motion.div
                        key={i}
                        className="w-20 h-20 rounded-xl flex items-center justify-center text-4xl relative overflow-hidden"
                        // While spinning: shake on Y axis
                        animate={
                          !isStopped && spinning
                            ? { y: [-6, 6, -6], transition: { repeat: Infinity, duration: 0.09, ease: "linear" } }
                            : isStopped
                            ? {
                                y: [4, -3, 1.5, -0.5, 0],
                                transition: { type: "spring", stiffness: 220, damping: 14, duration: 0.5 },
                              }
                            : { y: 0 }
                        }
                        style={{
                          background: showWinGlow
                            ? "rgba(245,158,11,0.18)"
                            : "rgba(255,255,255,0.05)",
                          border: showWinGlow
                            ? "1px solid rgba(245,158,11,0.5)"
                            : "1px solid rgba(255,255,255,0.08)",
                          boxShadow: showWinGlow ? "0 0 24px rgba(245,158,11,0.35)" : undefined,
                        }}
                      >
                        {/* Win pulse overlay */}
                        {showWinGlow && (
                          <motion.div
                            className="absolute inset-0 rounded-xl"
                            animate={{ opacity: [0, 0.3, 0] }}
                            transition={{ duration: 0.8, repeat: 3, ease: "easeInOut" }}
                            style={{ background: "radial-gradient(circle, rgba(245,158,11,0.4), transparent)" }}
                          />
                        )}
                        {SYMBOL_MAP[symbol] ?? symbol}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Pay line */}
                <div
                  className="h-0.5 mx-2 rounded mb-4"
                  style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }}
                />

                {/* Result */}
                <AnimatePresence>
                  {result && !spinning && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: [0.8, 1.08, 1] }}
                      transition={{ type: "spring", stiffness: 300, damping: 18 }}
                      className="text-center"
                    >
                      <div
                        className="text-xl font-bold"
                        style={{
                          color: isWin ? "#10b981" : "#ef4444",
                          textShadow: isWin ? "0 0 20px rgba(16,185,129,0.5)" : undefined,
                        }}
                      >
                        {isWin
                          ? `🎉 ${result.multiplier}x — +$${result.payout.toFixed(2)}`
                          : `No win — -$${parseFloat(amount).toFixed(2)}`}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Paytable toggle */}
              <button
                onClick={() => setShowPaytable(!showPaytable)}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                {showPaytable ? "Hide" : "Show"} paytable
              </button>

              {showPaytable && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="w-full max-w-sm"
                >
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.1)" }}
                  >
                    <p className="text-xs font-semibold text-gray-400 mb-3">Paytable</p>
                    <div className="space-y-1.5">
                      {PAYTABLE.map((row) => (
                        <div key={row.symbols} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{row.symbols}</span>
                          <span className="font-semibold text-amber-400">{row.multiplier}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Spin</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-black/30 border-white/10 text-white"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {[0.1, 1, 5, 10].map((q) => (
                        <button
                          key={q}
                          onClick={() => setAmount(String(q))}
                          className="flex-1 py-1 text-xs rounded-md"
                          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b" }}
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
                    onClick={handleSpin}
                    disabled={isPending || spinning || !user}
                    className="w-full h-14 text-lg font-bold"
                    style={{
                      background: spinning
                        ? "rgba(245,158,11,0.3)"
                        : "linear-gradient(135deg, #ec4899, #db2777)",
                      color: "white",
                      boxShadow: !spinning ? "0 0 20px rgba(236,72,153,0.3)" : undefined,
                    }}
                  >
                    {spinning ? "🎰 Spinning..." : "🎰 SPIN"}
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
                  {(history?.bets ?? []).slice(0, 8).map((b) => (
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

export default Slots;
