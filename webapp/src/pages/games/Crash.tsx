import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { useCrashStore } from "@/stores/useCrashStore";
import { useSocket } from "@/hooks/useSocket";
import { useSocketListeners } from "@/hooks/useSocketListeners";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Countdown helper ──────────────────────────────────────────────────────

function useCountdown(endsAt: number | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!endsAt) { setRemaining(0); return; }
    const update = () => setRemaining(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [endsAt]);
  return remaining;
}

// ── Main component ────────────────────────────────────────────────────────

const Crash = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [betPending, setBetPending] = useState(false);
  const [cashoutPending, setCashoutPending] = useState(false);

  const user = useAuthStore((s) => s.user);
  const updateBalance = useAuthStore((s) => s.updateBalance);
  const { socket, connected } = useSocket();
  useSocketListeners(socket);

  const { status, multiplier, crashPoint, serverSeedHash, serverSeed, bets, myBet, lastCrashPoint, bettingEndsAt } =
    useCrashStore();
  const countdown = useCountdown(bettingEndsAt);
  const { data: history } = useGameHistory("crash");

  // ── Socket acks ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const onBetAck = (data: { success: boolean; newBalance?: number; error?: string }) => {
      setBetPending(false);
      if (data.success) {
        if (data.newBalance !== undefined) updateBalance(data.newBalance);
        toast.success("Bet placed! 🚀");
        useCrashStore.getState().setMyBet({
          userId: user?.id ?? "",
          username: user?.username ?? "",
          amount: parseFloat(amount) || 0,
          autoCashout: parseFloat(autoCashout) || 2,
          cashedOut: false,
          cashoutMultiplier: null,
          payout: null,
        });
      } else {
        toast.error("Bet failed", { description: data.error });
      }
    };

    const onCashoutAck = (data: { success: boolean; multiplier?: number; payout?: number; error?: string }) => {
      setCashoutPending(false);
      if (data.success && data.payout !== undefined) {
        // Read current balance via getState() to avoid stale closure
        const currentBalance = useAuthStore.getState().user?.balance ?? 0;
        updateBalance(currentBalance + data.payout);
        toast.success(`Cashed out at ${data.multiplier?.toFixed(2)}x — $${data.payout.toFixed(2)}!`);
      } else if (!data.success) {
        toast.error("Cashout failed", { description: data.error });
      }
    };

    socket.on("crash:bet_ack", onBetAck);
    socket.on("crash:cashout_ack", onCashoutAck);
    return () => {
      socket.off("crash:bet_ack", onBetAck);
      socket.off("crash:cashout_ack", onCashoutAck);
    };
  }, [socket, amount, autoCashout, user, updateBalance]);

  const handlePlaceBet = () => {
    if (!socket || !connected) { toast.error("Not connected to server"); return; }
    const amt = parseFloat(amount);
    const ac = parseFloat(autoCashout);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!ac || ac < 1.01) { toast.error("Auto-cashout must be ≥ 1.01x"); return; }
    if (status !== "betting") { toast.error("Betting is not open right now"); return; }
    if (myBet) { toast.error("You already have a bet this round"); return; }
    setBetPending(true);
    socket.emit("crash:bet", { amount: amt, autoCashout: ac });
  };

  const handleCashout = () => {
    if (!socket || !connected) return;
    if (status !== "flying" || !myBet || myBet.cashedOut) return;
    setCashoutPending(true);
    socket.emit("crash:cashout");
  };

  const multiplierColor =
    status === "crashed" ? "#ef4444" :
    multiplier >= 10 ? "#10b981" :
    multiplier >= 3 ? "#f59e0b" : "#ffffff";

  const activePayout = myBet && !myBet.cashedOut
    ? myBet.amount * multiplier
    : 0;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "#0a0a0f" }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <Link to="/lobby">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <span className="text-2xl">🚀</span>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Crash</h1>
              <p className="text-xs text-gray-500">Multiplayer · 1% house edge</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {connected ? (
                <><Wifi className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">Live</span></>
              ) : (
                <><WifiOff className="h-3.5 w-3.5 text-red-400" /><span className="text-red-400">Offline</span></>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 max-w-5xl">
            {/* Left: multiplier display + live bets */}
            <div className="flex flex-col gap-4">
              {/* Multiplier display */}
              <div
                className="rounded-2xl relative overflow-hidden"
                style={{
                  background: "rgba(13,13,20,0.9)",
                  border: `1px solid ${status === "crashed" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.15)"}`,
                  minHeight: 240,
                }}
              >
                {/* Animated background grid */}
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(245,158,11,0.05) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(245,158,11,0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: "40px 40px",
                  }}
                />

                <div className="relative flex flex-col items-center justify-center h-60">
                  <AnimatePresence mode="wait">
                    {status === "waiting" && (
                      <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                        {lastCrashPoint !== null && (
                          <p className="text-xs text-gray-600 mb-2">
                            Last: <span className="text-red-400 font-mono">{lastCrashPoint.toFixed(2)}x</span>
                          </p>
                        )}
                        <p className="text-sm text-gray-500 animate-pulse">Starting next round…</p>
                      </motion.div>
                    )}
                    {status === "betting" && (
                      <motion.div key="betting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center">
                        <div className="text-6xl font-black font-mono mb-2" style={{ color: "#f59e0b" }}>
                          {countdown}s
                        </div>
                        <p className="text-sm text-gray-400">Place your bets</p>
                        <p className="text-xs text-gray-600 mt-1">{bets.length} player{bets.length !== 1 ? "s" : ""} ready</p>
                      </motion.div>
                    )}
                    {status === "flying" && (
                      <motion.div key="flying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <motion.div
                          className="text-7xl font-black font-mono tabular-nums"
                          style={{ color: multiplierColor, textShadow: `0 0 40px ${multiplierColor}60` }}
                          animate={{ scale: [1, 1.02, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                        >
                          {multiplier.toFixed(2)}x
                        </motion.div>
                        {myBet && !myBet.cashedOut ? (
                          <p className="text-sm text-green-400 mt-2 font-semibold">
                            +${activePayout.toFixed(2)} if cashed now
                          </p>
                        ) : null}
                      </motion.div>
                    )}
                    {status === "crashed" && (
                      <motion.div
                        key="crashed"
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-center"
                      >
                        <div className="text-xs text-red-400 uppercase tracking-widest mb-2 font-bold">💥 Crashed!</div>
                        <div className="text-7xl font-black font-mono" style={{ color: "#ef4444" }}>
                          {(crashPoint ?? multiplier).toFixed(2)}x
                        </div>
                        {myBet ? (
                          <p className="text-sm mt-2">
                            {myBet.cashedOut
                              ? <span className="text-green-400">You cashed out @ {myBet.cashoutMultiplier?.toFixed(2)}x ✓</span>
                              : <span className="text-red-400">You lost ${myBet.amount.toFixed(2)} 💸</span>
                            }
                          </p>
                        ) : null}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Live bets */}
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-gray-500" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Live Bets ({bets.length})
                  </span>
                </div>
                {bets.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">No bets yet this round</p>
                ) : (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {bets.map((bet, i) => (
                      <div key={`${bet.userId}-${i}`} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `hsl(${(i * 67) % 360},60%,40%)`, color: "white" }}
                          >
                            {bet.username[0]?.toUpperCase()}
                          </div>
                          <span className={cn("truncate max-w-[80px]", bet.userId === user?.id ? "text-amber-400" : "text-gray-300")}>
                            {bet.userId === user?.id ? "You" : bet.username}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-gray-500">${bet.amount.toFixed(2)}</span>
                          {bet.cashedOut ? (
                            <span className="text-green-400 font-semibold">
                              +${(bet.payout ?? 0).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-600 text-xs">@{bet.autoCashout.toFixed(2)}x</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: controls + history */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Place Bet</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0.01"
                      className="bg-black/30 border-white/10 text-white"
                      disabled={status !== "betting" || !!myBet}
                    />
                    <div className="flex gap-1.5 mt-2">
                      {[1, 5, 10, 100].map((v) => (
                        <button
                          key={v}
                          onClick={() => setAmount(String(v))}
                          disabled={status !== "betting" || !!myBet}
                          className="flex-1 py-1 text-xs rounded-md disabled:opacity-40 transition-opacity"
                          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)", color: "#f59e0b" }}
                        >
                          ${v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Auto Cash Out</label>
                    <Input
                      type="number"
                      value={autoCashout}
                      onChange={(e) => setAutoCashout(e.target.value)}
                      min="1.01"
                      step="0.01"
                      placeholder="2.00"
                      className="bg-black/30 border-white/10 text-white"
                      disabled={status !== "betting" || !!myBet}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Balance</span>
                    <span className="text-white">${user?.balance.toFixed(2) ?? "0.00"}</span>
                  </div>

                  {(status === "flying" && myBet && !myBet.cashedOut) ? (
                    <Button
                      onClick={handleCashout}
                      disabled={cashoutPending}
                      className="w-full h-11 font-bold text-sm"
                      style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
                    >
                      {cashoutPending ? "Cashing out…" : `Cash Out @ ${multiplier.toFixed(2)}x`}
                    </Button>
                  ) : (
                    <Button
                      onClick={handlePlaceBet}
                      disabled={betPending || !user || status !== "betting" || !!myBet || !connected}
                      className="w-full h-11 font-semibold"
                      style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
                    >
                      {!connected ? "Connecting…" :
                       betPending ? "Placing…" :
                       myBet ? "Bet placed ✓" :
                       status === "betting" ? "Place Bet 🚀" :
                       "Waiting for next round…"}
                    </Button>
                  )}

                  {/* Provably fair seeds */}
                  {serverSeedHash && (
                    <div className="rounded-lg p-2.5 text-xs font-mono"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.08)" }}>
                      <p className="text-gray-600 mb-1">Server seed hash (provably fair):</p>
                      <p className="text-gray-500 break-all">{serverSeedHash.slice(0, 40)}…</p>
                      {serverSeed && (
                        <>
                          <p className="text-gray-600 mt-2 mb-1">Revealed:</p>
                          <p className="text-gray-400 break-all">{serverSeed.slice(0, 32)}…</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent history */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">My History</h3>
                <div className="space-y-1.5">
                  {(history?.bets ?? []).slice(0, 8).map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-gray-500">${b.amount.toFixed(2)}</span>
                      <span className={cn("font-semibold", b.outcome === "win" ? "text-green-400" : "text-red-400")}>
                        {b.outcome === "win" ? `+$${(b.payout ?? 0).toFixed(2)}` : `-$${b.amount.toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                  {(!history?.bets || history.bets.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-3">No history yet</p>
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
