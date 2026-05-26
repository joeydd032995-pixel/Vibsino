import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePokerDeal, usePokerDraw, useGameHistory } from "@/hooks/useGameApi";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import type { PokerDealResult, PokerDrawResult, Card } from "@/hooks/useGameApi";

type Phase = "idle" | "deal" | "draw" | "result";

const SUIT_SYMBOLS: Record<string, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
const SUIT_COLORS: Record<string, string> = { H: "#ef4444", D: "#ef4444", C: "#e5e7eb", S: "#e5e7eb" };

const PAYTABLE = [
  { hand: "Royal Flush", pays: "800x" },
  { hand: "Straight Flush", pays: "50x" },
  { hand: "Four of a Kind", pays: "25x" },
  { hand: "Full House", pays: "9x" },
  { hand: "Flush", pays: "6x" },
  { hand: "Straight", pays: "4x" },
  { hand: "Three of a Kind", pays: "3x" },
  { hand: "Two Pair", pays: "2x" },
  { hand: "Jacks or Better", pays: "1x" },
];

// 3D flip card component
// Key changes trigger re-mount → re-plays entrance animation
const CardDisplay = ({
  card,
  held,
  onClick,
  selectable,
  index,
}: {
  card: Card;
  held: boolean;
  onClick: () => void;
  selectable: boolean;
  index: number;
}) => (
  <div className="flex flex-col items-center gap-1.5" style={{ perspective: "700px" }}>
    <motion.button
      onClick={onClick}
      disabled={!selectable}
      // Entrance: flip in from face-down, staggered by index
      initial={{ rotateY: 90, y: -16, opacity: 0 }}
      animate={{ rotateY: 0, y: 0, opacity: 1 }}
      transition={{
        delay: index * 0.09,
        duration: 0.38,
        ease: [0.34, 1.26, 0.64, 1],
      }}
      whileHover={selectable ? { y: -8, transition: { duration: 0.15 } } : {}}
      whileTap={selectable ? { scale: 0.95 } : {}}
      className="relative w-16 h-24 md:w-20 md:h-28 rounded-xl flex flex-col items-start justify-start p-2"
      style={{
        background: held ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)",
        border: `2px solid ${held ? "#f59e0b" : "rgba(255,255,255,0.1)"}`,
        boxShadow: held
          ? "0 0 18px rgba(245,158,11,0.35), 0 4px 12px rgba(0,0,0,0.4)"
          : "0 4px 12px rgba(0,0,0,0.3)",
        cursor: selectable ? "pointer" : "default",
        transformStyle: "preserve-3d",
      }}
    >
      <span className="text-xs font-bold leading-none" style={{ color: SUIT_COLORS[card.suit] }}>
        {card.rank}
      </span>
      <span className="text-lg leading-none mt-0.5" style={{ color: SUIT_COLORS[card.suit] }}>
        {SUIT_SYMBOLS[card.suit]}
      </span>
      <span
        className="absolute bottom-2 right-2 text-base"
        style={{ color: SUIT_COLORS[card.suit], transform: "rotate(180deg)" }}
      >
        {SUIT_SYMBOLS[card.suit]}
      </span>
    </motion.button>
    {selectable && (
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-md transition-all duration-200"
        style={{
          background: held ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.05)",
          color: held ? "#f59e0b" : "#6b7280",
          border: `1px solid ${held ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.06)"}`,
        }}
      >
        {held ? "HOLD" : "discard"}
      </span>
    )}
  </div>
);

const Poker = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [amount, setAmount] = useState("5");
  const [phase, setPhase] = useState<Phase>("idle");
  const [betId, setBetId] = useState("");
  const [hand, setHand] = useState<Card[]>([]);
  const [heldIndices, setHeldIndices] = useState<number[]>([]);
  const [drawResult, setDrawResult] = useState<PokerDrawResult | null>(null);
  const [showPaytable, setShowPaytable] = useState(false);
  const [serverSeedHash, setServerSeedHash] = useState("");
  const [settledWager, setSettledWager] = useState<number>(0);
  // Increment on each deal to force all cards to re-mount → re-play entrance animation
  const [dealCount, setDealCount] = useState(0);

  const user = useAuthStore((s) => s.user);
  const { mutateAsync: deal, isPending: dealing } = usePokerDeal();
  const { mutateAsync: draw, isPending: drawing } = usePokerDraw();
  const { data: history } = useGameHistory("poker");

  const handleDeal = async () => {
    const amt = parseFloat(amount);
    if (!amt) return;
    setSettledWager(amt);
    setDrawResult(null);
    setHeldIndices([]);
    try {
      const res: PokerDealResult = await deal({ amount: amt });
      setBetId(res.betId);
      setHand(res.initialHand);
      setServerSeedHash(res.serverSeedHash);
      setDealCount((c) => c + 1);
      setPhase("deal");
    } catch {
      // handled by hook
    }
  };

  const handleDraw = async () => {
    try {
      const res: PokerDrawResult = await draw({ betId, heldIndices });
      setHand(res.finalHand);
      setDrawResult(res);
      setPhase("result");
    } catch {
      // handled
    }
  };

  const toggleHold = (i: number) => {
    setHeldIndices((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  };

  const isWin = drawResult?.outcome === "win";

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
            <span className="text-2xl">🃏</span>
            <div>
              <h1 className="text-xl font-bold text-white">Video Poker</h1>
              <p className="text-xs text-gray-500">Jacks or Better · 9/6 paytable</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
            {/* Card table */}
            <div
              className="rounded-2xl p-6 flex flex-col items-center gap-6 min-h-[360px]"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              {/* Hand display */}
              <div className="flex gap-2 md:gap-3 justify-center flex-wrap">
                {phase === "idle" ? (
                  // Placeholder cards
                  Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="w-16 h-24 md:w-20 md:h-28 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "2px dashed rgba(255,255,255,0.08)" }}
                    />
                  ))
                ) : (
                  hand.map((card, i) => (
                    <CardDisplay
                      // Key includes rank+suit+index+dealCount:
                      // - dealCount change → ALL cards remount → all flip in (deal)
                      // - rank/suit change → only that card remounts → only replaced cards flip in (draw)
                      // - held cards keep rank/suit → no remount → no unwanted re-animation
                      key={`${card.rank}${card.suit}-${i}-${dealCount}`}
                      card={card}
                      held={heldIndices.includes(i)}
                      onClick={() => phase === "deal" && toggleHold(i)}
                      selectable={phase === "deal"}
                      index={i}
                    />
                  ))
                )}
              </div>

              {/* Result */}
              <AnimatePresence>
                {drawResult && phase === "result" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="text-center"
                  >
                    <div
                      className="text-2xl font-bold"
                      style={{
                        color: isWin ? "#f59e0b" : "#ef4444",
                        textShadow: isWin ? "0 0 24px rgba(245,158,11,0.5)" : undefined,
                      }}
                    >
                      {drawResult.handRank}
                    </div>
                    <div className="text-sm mt-1" style={{ color: isWin ? "#10b981" : "#6b7280" }}>
                      {isWin
                        ? `${drawResult.payoutMultiplier}x — +$${drawResult.payout.toFixed(2)}`
                        : `-$${settledWager.toFixed(2)}`}
                    </div>
                  </motion.div>
                )}
                {phase === "deal" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-gray-400"
                  >
                    Click cards to hold, then draw
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Provably fair */}
              {phase !== "idle" && serverSeedHash && (
                <div
                  className="w-full rounded-lg p-2 text-xs font-mono text-gray-600 truncate"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  Hash: {serverSeedHash.slice(0, 48)}...
                </div>
              )}
              {drawResult && (
                <div
                  className="w-full rounded-lg p-3 text-xs font-mono break-all space-y-1"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.08)" }}
                >
                  <div><span className="text-gray-500">Server: </span><span className="text-gray-300">{drawResult.provablyFair.serverSeed.slice(0, 32)}...</span></div>
                  <div><span className="text-gray-500">Client: </span><span className="text-gray-300">{drawResult.provablyFair.clientSeed}</span></div>
                </div>
              )}

              {/* Paytable */}
              <button
                onClick={() => setShowPaytable(!showPaytable)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
              >
                Paytable <ChevronDown className={cn("h-3 w-3 transition-transform", showPaytable && "rotate-180")} />
              </button>
              <AnimatePresence>
                {showPaytable && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full overflow-hidden"
                  >
                    <div
                      className="rounded-xl p-4 grid grid-cols-2 gap-1"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.08)" }}
                    >
                      {PAYTABLE.map((row) => (
                        <div key={row.hand} className="flex items-center justify-between text-xs py-0.5 col-span-2">
                          <span className="text-gray-400">{row.hand}</span>
                          <span className="text-amber-400 font-semibold">{row.pays}</span>
                        </div>
                      ))}
                    </div>
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
                <h3 className="text-sm font-semibold text-gray-400 mb-4">Bet</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Bet Amount</label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-black/30 border-white/10 text-white"
                      disabled={phase === "deal"}
                    />
                    <div className="flex gap-1.5 mt-2">
                      {[1, 5, 25, 100].map((q) => (
                        <button
                          key={q}
                          onClick={() => setAmount(String(q))}
                          disabled={phase === "deal"}
                          className="flex-1 py-1 text-xs rounded-md disabled:opacity-40"
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

                  {(phase === "idle" || phase === "result") && (
                    <Button
                      onClick={handleDeal}
                      disabled={dealing || !user}
                      className="w-full h-11 font-semibold"
                      style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white" }}
                    >
                      {dealing ? "Dealing..." : "Deal Cards"}
                    </Button>
                  )}

                  {phase === "deal" && (
                    <>
                      <Button
                        onClick={handleDraw}
                        disabled={drawing}
                        className="w-full h-11 font-semibold"
                        style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "white" }}
                      >
                        {drawing ? "Drawing..." : `Draw (${5 - heldIndices.length} cards)`}
                      </Button>
                      <p className="text-xs text-gray-600 text-center">
                        {heldIndices.length === 0
                          ? "All cards will be replaced"
                          : `Keeping ${heldIndices.length} card${heldIndices.length > 1 ? "s" : ""}`}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* History */}
              <div
                className="rounded-2xl p-5"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Hands</h3>
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
                    <p className="text-xs text-gray-600 text-center py-4">No hands yet</p>
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

export default Poker;
