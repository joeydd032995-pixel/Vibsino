import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, RefreshCw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrash, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import type { GameResult } from "@/hooks/useGameApi";

const QUICK_BETS = [0.1, 1, 10, 100];

const Crash = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [result, setResult] = useState<GameResult | null>(null);
  const [displayMultiplier, setDisplayMultiplier] = useState(1.0);
  const [phase, setPhase] = useState<"idle" | "flying" | "crashed">("idle");
  const [showSeeds, setShowSeeds] = useState(false);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: play, isPending } = useCrash();
  const { data: history } = useGameHistory("crash");

  const handlePlay = async () => {
    const amt = parseFloat(amount);
    const ac = parseFloat(autoCashout);
    if (!amt || !ac || ac < 1.01) return;

    setPhase("flying");
    setDisplayMultiplier(1.0);
    setResult(null);

    try {
      const res = await play({ amount: amt, autoCashout: ac });
      const gd = res.gameData as { crashPoint?: number; cashedOut?: boolean; autoCashout?: number };
      const target = gd.cashedOut ? (gd.autoCashout ?? ac) : (gd.crashPoint ?? 1.0);
      let current = 1.0;

      animRef.current = setInterval(() => {
        current = Math.min(current * 1.07, target);
        setDisplayMultiplier(Math.round(current * 100) / 100);
        if (current >= target) {
          if (animRef.current) clearInterval(animRef.current);
          setPhase("crashed");
          setResult(res);
        }
      }, 50);
    } catch {
      setPhase("idle");
    }
  };

  useEffect(() => {
    return () => { if (animRef.current) clearInterval(animRef.current); };
  }, []);

  const gd = result?.gameData as { crashPoint?: number; cashedOut?: boolean } | undefined;
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
            <span className="text-2xl">🚀</span>
            <div>
              <h1 className="text-xl font-bold text-white">Crash</h1>
              <p className="text-xs text-gray-500">1% house edge · Auto-cashout</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
            {/* Chart area */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 opacity-10">
                {[1,2,3,4].map(i => (
                  <div key={i} className="absolute left-0 right-0 border-t border-white/20" style={{ top: `${i * 20}%` }} />
                ))}
              </div>

              {/* Multiplier display */}
              <motion.div
                className="relative z-10 text-center"
                animate={phase === "flying" ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <div
                  className="font-mono text-7xl font-black tabular-nums"
                  style={{
                    color: phase === "crashed" && !isWin ? "#ef4444" : phase === "crashed" && isWin ? "#10b981" : "#f59e0b",
                    textShadow: phase === "flying" ? "0 0 30px rgba(245,158,11,0.5)" : undefined,
                  }}
                >
                  {displayMultiplier.toFixed(2)}x
                </div>
                <div className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-2">
                  {phase === "flying" && (
                    <>
                      <TrendingUp className="h-4 w-4 text-amber-500" />
                      <span className="text-amber-500">Flying...</span>
                    </>
                  )}
                  {phase === "crashed" && (
                    <span style={{ color: isWin ? "#10b981" : "#ef4444" }}>
                      {isWin ? `Cashed out ✓` : `Crashed @ ${gd?.crashPoint?.toFixed(2)}x`}
                    </span>
                  )}
                  {phase === "idle" && <span>Set auto-cashout and place bet</span>}
                </div>
              </motion.div>

              {/* Win/loss banner */}
              <AnimatePresence>
                {result && phase === "crashed" && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <div
                      className="text-2xl font-bold text-center"
                      style={{ color: isWin ? "#10b981" : "#ef4444" }}
                    >
                      {isWin ? `+$${result.payout.toFixed(2)}` : `-$${parseFloat(amount).toFixed(2)}`}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Provably fair */}
              {result && (
                <button
                  onClick={() => setShowSeeds(!showSeeds)}
                  className="absolute bottom-4 right-4 text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  {showSeeds ? "Hide" : "Verify"}
                </button>
              )}
              {showSeeds && result && (
                <div
                  className="absolute bottom-12 right-4 left-4 rounded-lg p-3 text-xs font-mono break-all space-y-1"
                  style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(245,158,11,0.15)" }}
                >
                  <div><span className="text-gray-500">Server: </span><span className="text-gray-300">{result.provablyFair.serverSeed.slice(0, 32)}...</span></div>
                  <div><span className="text-gray-500">Client: </span><span className="text-gray-300">{result.provablyFair.clientSeed}</span></div>
                </div>
              )}
            </div>

            {/* Controls */}
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
                      className="bg-black/30 border-white/10 text-white"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {QUICK_BETS.map((q) => (
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

                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Auto Cashout (min 1.01x)</label>
                    <Input
                      type="number"
                      value={autoCashout}
                      onChange={(e) => setAutoCashout(e.target.value)}
                      min="1.01"
                      max="1000"
                      step="0.01"
                      className="bg-black/30 border-white/10 text-white"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {[1.5, 2, 3, 5].map((x) => (
                        <button
                          key={x}
                          onClick={() => setAutoCashout(String(x))}
                          className="flex-1 py-1 text-xs rounded-md"
                          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b" }}
                        >
                          {x}x
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
                    disabled={isPending || phase === "flying" || !user}
                    className="w-full h-11 font-semibold"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white" }}
                  >
                    {phase === "flying" ? "🚀 Flying..." : "Place Bet"}
                  </Button>

                  {phase === "crashed" && (
                    <Button
                      variant="outline"
                      onClick={() => { setPhase("idle"); setResult(null); setDisplayMultiplier(1.0); }}
                      className="w-full h-9 text-xs"
                    >
                      Play Again
                    </Button>
                  )}
                </div>
              </div>

              {/* History */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Bets</h3>
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

export default Crash;
