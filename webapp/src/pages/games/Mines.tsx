import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Bomb, Gem, RefreshCw, DollarSign } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMinesGame, useMinesReveal, useMinesCashout, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import type { MinesStartResult, MinesRevealResult, MinesCashoutResult } from "@/hooks/useGameApi";

type GamePhase = "idle" | "playing" | "won" | "lost";

interface MinesState {
  betId: string;
  mineCount: number;
  revealedSafe: number[];
  minePositions: number[];
  currentMultiplier: number;
  phase: GamePhase;
  serverSeedHash: string;
}

const MINE_COUNTS = [1, 3, 5, 10, 24];

const Mines = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("1");
  const [mineCount, setMineCount] = useState(3);
  const [game, setGame] = useState<MinesState | null>(null);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: startGame, isPending: starting } = useMinesGame();
  const { mutateAsync: reveal, isPending: revealing } = useMinesReveal();
  const { mutateAsync: cashout, isPending: cashingOut } = useMinesCashout();
  const { data: history } = useGameHistory("mines");

  const handleStart = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    try {
      const res: MinesStartResult = await startGame({ amount: amt, mineCount });
      setGame({
        betId: res.betId,
        mineCount: res.mineCount,
        revealedSafe: [],
        minePositions: [],
        currentMultiplier: 0,
        phase: "playing",
        serverSeedHash: res.serverSeedHash,
      });
    } catch {
      // error handled by hook
    }
  };

  const handleReveal = async (tileIndex: number) => {
    if (!game || game.phase !== "playing") return;
    if (game.revealedSafe.includes(tileIndex)) return;
    if (game.minePositions.includes(tileIndex)) return;

    try {
      const res: MinesRevealResult = await reveal({ betId: game.betId, tileIndex });
      if (res.hit) {
        setGame((g) => g ? { ...g, minePositions: res.minePositions ?? [], phase: "lost" } : g);
      } else {
        setGame((g) =>
          g
            ? {
                ...g,
                revealedSafe: res.revealedSafe ?? [...g.revealedSafe, tileIndex],
                currentMultiplier: res.currentMultiplier ?? g.currentMultiplier,
              }
            : g
        );
      }
    } catch {
      // handled
    }
  };

  const handleCashout = async () => {
    if (!game || game.phase !== "playing" || game.revealedSafe.length === 0) return;
    try {
      const res: MinesCashoutResult = await cashout({ betId: game.betId });
      setGame((g) =>
        g
          ? {
              ...g,
              minePositions: res.minePositions,
              currentMultiplier: res.multiplier,
              phase: "won",
            }
          : g
      );
    } catch {
      // handled
    }
  };

  const handleReset = () => {
    setGame(null);
  };

  const getTileState = (i: number) => {
    if (!game) return "hidden";
    if (game.minePositions.includes(i)) return "mine";
    if (game.revealedSafe.includes(i)) return "safe";
    return "hidden";
  };

  const canCashout = game?.phase === "playing" && (game.revealedSafe.length ?? 0) > 0;
  const betAmount = parseFloat(amount) || 0;
  const potentialPayout = game ? betAmount * game.currentMultiplier : 0;

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
            <span className="text-2xl">💣</span>
            <div>
              <h1 className="text-xl font-bold text-white">Mines</h1>
              <p className="text-xs text-gray-500">1% house edge · Reveal tiles, avoid mines</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
            {/* Grid area */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Multiplier display */}
              {game && (
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-xs text-gray-500">Current multiplier</span>
                    <div
                      className="text-2xl font-bold"
                      style={{ color: game.currentMultiplier > 1 ? "#10b981" : "#f59e0b" }}
                    >
                      {game.currentMultiplier > 0 ? `${game.currentMultiplier.toFixed(2)}x` : "—"}
                    </div>
                  </div>
                  {canCashout && (
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Cashout amount</span>
                      <div className="text-2xl font-bold text-green-400">
                        ${potentialPayout.toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Phase banner */}
              <AnimatePresence>
                {game && (game.phase === "won" || game.phase === "lost") && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-3 rounded-xl text-center font-semibold"
                    style={{
                      background: game.phase === "won" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
                      border: `1px solid ${game.phase === "won" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                      color: game.phase === "won" ? "#10b981" : "#ef4444",
                    }}
                  >
                    {game.phase === "won"
                      ? `💰 Cashed out at ${game.currentMultiplier.toFixed(2)}x — $${potentialPayout.toFixed(2)}`
                      : "💥 You hit a mine!"}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 5x5 Grid */}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 25 }, (_, i) => {
                  const state = getTileState(i);
                  const isClickable = game?.phase === "playing" && state === "hidden" && !revealing;
                  return (
                    <motion.button
                      key={i}
                      onClick={() => isClickable && handleReveal(i)}
                      disabled={!isClickable}
                      whileHover={isClickable ? { scale: 1.05 } : {}}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                      animate={
                        state === "mine"
                          ? { scale: [1, 1.2, 1], backgroundColor: ["#1a1a2e", "#7f1d1d", "#7f1d1d"] }
                          : state === "safe"
                          ? { scale: [1, 1.15, 1] }
                          : {}
                      }
                      className={cn(
                        "aspect-square rounded-xl flex items-center justify-center transition-colors",
                        isClickable && "cursor-pointer hover:brightness-110"
                      )}
                      style={{
                        background:
                          state === "mine"
                            ? "rgba(239,68,68,0.25)"
                            : state === "safe"
                            ? "rgba(16,185,129,0.2)"
                            : game?.phase === "idle" || !game
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(255,255,255,0.06)",
                        border:
                          state === "mine"
                            ? "1px solid rgba(239,68,68,0.4)"
                            : state === "safe"
                            ? "1px solid rgba(16,185,129,0.4)"
                            : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {state === "mine" && <Bomb className="h-5 w-5 text-red-400" />}
                      {state === "safe" && <Gem className="h-5 w-5 text-green-400" />}
                      {state === "hidden" && game?.phase === "playing" && (
                        <span className="text-gray-600 text-xs">?</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Server seed hash */}
              {game && (
                <div className="mt-4 p-2 rounded-lg text-xs font-mono text-gray-600 truncate"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  Hash: {game.serverSeedHash.slice(0, 48)}...
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                {!game || game.phase === "won" || game.phase === "lost" ? (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400">New Game</h3>
                    <div>
                      <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="bg-black/30 border-white/10 text-white"
                        disabled={starting}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-2 block">Mines Count</label>
                      <div className="flex gap-2 flex-wrap">
                        {MINE_COUNTS.map((m) => (
                          <button
                            key={m}
                            onClick={() => setMineCount(m)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                            style={{
                              background: mineCount === m ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                              border: `1px solid ${mineCount === m ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                              color: mineCount === m ? "#f59e0b" : "#9ca3af",
                            }}
                          >
                            {m} {m === 1 ? "mine" : "mines"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Balance</span>
                      <span className="text-white">${user?.balance.toFixed(2) ?? "0.00"}</span>
                    </div>
                    <Button
                      onClick={game ? handleReset : handleStart}
                      disabled={starting || !user}
                      className="w-full h-11 font-semibold"
                      style={{
                        background: game ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                        color: "white",
                      }}
                    >
                      {starting ? "Starting..." : game ? "New Game" : `Start — $${parseFloat(amount).toFixed(2)}`}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400">Game Active</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg p-3 text-center" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <div className="text-2xl font-bold text-red-400">{game.mineCount}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Mines</div>
                      </div>
                      <div className="rounded-lg p-3 text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <div className="text-2xl font-bold text-green-400">{game.revealedSafe.length}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Safe Revealed</div>
                      </div>
                    </div>
                    <Button
                      onClick={handleCashout}
                      disabled={!canCashout || cashingOut}
                      className="w-full h-11 font-semibold"
                      style={{
                        background: canCashout
                          ? "linear-gradient(135deg, #10b981, #059669)"
                          : "rgba(255,255,255,0.06)",
                        color: canCashout ? "white" : "#6b7280",
                      }}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      {cashingOut
                        ? "Cashing out..."
                        : canCashout
                        ? `Cashout $${potentialPayout.toFixed(2)}`
                        : "Reveal a tile first"}
                    </Button>
                  </div>
                )}
              </div>

              {/* History */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Bets</h3>
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

export default Mines;
