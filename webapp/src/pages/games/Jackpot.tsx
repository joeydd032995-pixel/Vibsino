import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Trophy, Users, Ticket } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJackpotBet, useJackpotState, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

const Jackpot = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [lastResult, setLastResult] = useState<{ winnerId?: string; winnerIndex?: number } | null>(null);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: placeBet, isPending } = useJackpotBet();
  const { data: jackpot, refetch } = useJackpotState();
  const { data: history } = useGameHistory("jackpot");

  const handleBet = async () => {
    const amt = parseFloat(amount);
    if (!amt) return;
    try {
      const res = await placeBet({ amount: amt });
      if (res.jackpotResult) {
        setLastResult(res.jackpotResult as { winnerId?: string; winnerIndex?: number });
      }
      refetch();
    } catch {
      // handled by hook
    }
  };

  const totalTickets = jackpot?.participants.reduce((s, p) => s + p.tickets, 0) ?? 0;
  const myTickets =
    jackpot?.participants
      .filter(() => true) // Would filter by current user, but we don't have that info here
      .reduce((s, p) => s + p.tickets, 0) ?? 0;

  const threshold = jackpot?.threshold ?? 10;
  const participantCount = jackpot?.participants.length ?? 0;
  const progress = Math.min(100, (participantCount / threshold) * 100);

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
            <span className="text-2xl">🏆</span>
            <div>
              <h1 className="text-xl font-bold text-white">Jackpot</h1>
              <p className="text-xs text-gray-500">5% house edge · Bigger bet = more tickets</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 max-w-5xl">
            {/* Pool display */}
            <div
              className="rounded-2xl p-6"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Pool amount */}
              <div className="text-center mb-8">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Current Pool</div>
                <motion.div
                  className="font-mono text-6xl font-black"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b, #fbbf24, #f59e0b)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundSize: "200%",
                  }}
                  animate={{ backgroundPosition: ["0%", "100%", "0%"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  ${(jackpot?.pool ?? 0).toFixed(2)}
                </motion.div>
                <div className="text-sm text-gray-500 mt-2">
                  <span className="text-white">{participantCount}</span> of{" "}
                  <span className="text-white">{threshold}</span> entries needed to trigger draw
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-500 mb-2">
                  <span>Draw Progress</span>
                  <span>{participantCount}/{threshold} entries</span>
                </div>
                <div
                  className="h-3 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-semibold text-gray-400">Participants</span>
                </div>
                {jackpot?.participants && jackpot.participants.length > 0 ? (
                  <div className="space-y-2">
                    {jackpot.participants.map((p, i) => {
                      const chance = totalTickets > 0 ? (p.tickets / totalTickets) * 100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: `hsl(${(i * 67) % 360}, 70%, 45%)` }}
                          >
                            {p.username[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-gray-300 truncate">{p.username}</span>
                              <span className="text-gray-500 ml-2">{chance.toFixed(1)}%</span>
                            </div>
                            <div
                              className="h-1.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${chance}%`,
                                  background: `hsl(${(i * 67) % 360}, 70%, 45%)`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="text-right text-xs shrink-0">
                            <div className="text-white">${p.amount.toFixed(2)}</div>
                            <div className="text-gray-600">{p.tickets}🎟</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-10 w-10 text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Be the first to enter the jackpot!</p>
                  </div>
                )}
              </div>

              {/* Winner announcement */}
              <AnimatePresence>
                {lastResult && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 p-4 rounded-xl text-center"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}
                  >
                    <Trophy className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-amber-400">Jackpot triggered!</p>
                    <p className="text-xs text-gray-400 mt-1">Winner selected from entries</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Enter Jackpot</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      className="bg-black/30 border-white/10 text-white"
                    />
                    <div className="flex gap-1.5 mt-2">
                      {[1, 5, 10, 25].map((q) => (
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

                  <div
                    className="rounded-lg p-3 text-xs"
                    style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
                  >
                    <div className="flex items-center gap-2 text-amber-400">
                      <Ticket className="h-3.5 w-3.5" />
                      <span className="font-semibold">
                        {Math.max(1, Math.floor(parseFloat(amount) || 0))} ticket(s)
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1">1 ticket per $1 bet</p>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Balance</span>
                    <span className="text-white">${user?.balance.toFixed(2) ?? "0.00"}</span>
                  </div>

                  <Button
                    onClick={handleBet}
                    disabled={isPending || !user}
                    className="w-full h-11 font-semibold"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
                  >
                    {isPending ? "Entering..." : "Enter Jackpot 🏆"}
                  </Button>
                </div>
              </div>

              {/* Server seed hash */}
              {jackpot?.serverSeedHash && (
                <div
                  className="rounded-xl p-3 text-xs font-mono text-gray-600"
                  style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.08)" }}
                >
                  <p className="text-gray-500 mb-1">Server seed hash (provably fair):</p>
                  <p className="break-all">{jackpot.serverSeedHash.slice(0, 48)}...</p>
                </div>
              )}

              {/* History */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Entries</h3>
                <div className="space-y-2">
                  {(history?.bets ?? []).slice(0, 6).map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-gray-500">${b.amount.toFixed(2)}</span>
                      <span className={cn("font-semibold", b.outcome === "win" ? "text-green-400" : "text-gray-600")}>
                        {b.outcome === "win" ? `Won $${b.payout?.toFixed(2)}` : "Entered"}
                      </span>
                    </div>
                  ))}
                  {(!history?.bets || history.bets.length === 0) && (
                    <p className="text-xs text-gray-600 text-center py-4">No entries yet</p>
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

export default Jackpot;
