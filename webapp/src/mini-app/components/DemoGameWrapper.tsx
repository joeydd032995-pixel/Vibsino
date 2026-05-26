import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shield, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useTelegram } from "../context/TelegramContext";
import { MiniGameType } from "./GameSelector";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DemoGameWrapperProps {
  gameType: MiniGameType;
  onBack: () => void;
  currentBalance: string;
}

interface ProvablyFairInfo {
  serverSeedId: string;
  hashedSeed: string;
  clientSeed: string;
  nonce: number;
}

interface GameResult {
  betId: string;
  gameType: string;
  outcome: "win" | "loss";
  payout: string;
  multiplier: number;
  newBalance: string;
  amount?: string;
  gameData: Record<string, unknown>;
  provablyFair: ProvablyFairInfo;
}

interface MinesStartResult {
  betId: string;
  mineCount: number;
  gridSize: number;
  hashedSeed: string;
  clientSeed: string;
  newBalance: string;
}

interface MinesRevealResult {
  tileIndex: number;
  isMine: boolean;
  currentMultiplier?: number;
  revealedTiles?: number[];
  outcome?: string;
  payout?: string;
  minePositions?: number[];
  newBalance?: string;
}

interface MinesCashoutResult {
  outcome: string;
  payout: string;
  multiplier: number;
  minePositions: number[];
  revealedTiles: number[];
  newBalance: string;
  provablyFair: ProvablyFairInfo;
}

type GamePhase = "idle" | "playing" | "result" | "mines_active";

/** Format VIBES for display */
function fmtVibes(s: string): string {
  try {
    const n = BigInt(s);
    return (n / 1000n).toLocaleString("en-US");
  } catch {
    return "0";
  }
}

/** Get game display label */
function gameLabel(gt: MiniGameType): string {
  return {
    coinflip: "Coinflip",
    crash: "Crash",
    mines: "Mines",
    slots: "Slots",
    roulette: "Roulette",
    poker: "Video Poker",
  }[gt];
}

/** Get game icon */
function gameIcon(gt: MiniGameType): string {
  return { coinflip: "🪙", crash: "🚀", mines: "💣", slots: "🎰", roulette: "🎡", poker: "🃏" }[gt];
}

export default function DemoGameWrapper({
  gameType,
  onBack,
  currentBalance,
}: DemoGameWrapperProps) {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const { haptic } = useTelegram();

  const [phase, setPhase] = useState<GamePhase>("idle");
  const [amount, setAmount] = useState("1000"); // 1.000 VIBES
  const [result, setResult] = useState<GameResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPF, setShowPF] = useState(false);

  // Game-specific state
  const [coinflipChoice, setCoinflipChoice] = useState<"heads" | "tails">("heads");
  const [crashAutoCashout, setCrashAutoCashout] = useState(2);
  const [rouletteBetColor, setRouletteBetColor] = useState<"red" | "black">("red");

  // Mines state
  const [mineCount, setMineCount] = useState(3);
  const [minesBetId, setMinesBetId] = useState<string | null>(null);
  const [minesHashedSeed, setMinesHashedSeed] = useState<string | null>(null);
  const [minesRevealedTiles, setMinesRevealedTiles] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[]>([]);
  const [minesMultiplier, setMinesMultiplier] = useState(1);
  const [minesOver, setMinesOver] = useState(false);

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const invalidateBalance = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["virtualBalance"] });
  }, [queryClient]);

  // ── Single-round games ──────────────────────────────────────────────────────

  const playSingleRound = async () => {
    if (isLoading) return;
    setIsLoading(true);
    haptic.impact();

    const betData: Record<string, unknown> = {};
    if (gameType === "coinflip") betData.choice = coinflipChoice;
    if (gameType === "crash") betData.autoCashout = crashAutoCashout;
    if (gameType === "roulette") betData.betColor = rouletteBetColor;

    try {
      const data = await api.post<GameResult>(
        `/api/demo/play/${gameType}`,
        { amount, betData },
        { headers: authHeaders }
      );
      setResult(data);
      setPhase("result");
      invalidateBalance();
      if (data.outcome === "win") {
        haptic.success();
        toast.success(`Won ${fmtVibes(data.payout)} VIBES! 🎉`);
      } else {
        haptic.error();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Game failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Mines game ──────────────────────────────────────────────────────────────

  const startMines = async () => {
    if (isLoading) return;
    setIsLoading(true);
    haptic.impact();
    try {
      const data = await api.post<MinesStartResult>(
        "/api/demo/mines/start",
        { amount, mineCount },
        { headers: authHeaders }
      );
      setMinesBetId(data.betId);
      setMinesHashedSeed(data.hashedSeed);
      setMinesRevealedTiles([]);
      setMinePositions([]);
      setMinesMultiplier(1);
      setMinesOver(false);
      setPhase("mines_active");
      invalidateBalance();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start mines");
    } finally {
      setIsLoading(false);
    }
  };

  const revealTile = async (tileIndex: number) => {
    if (!minesBetId || minesRevealedTiles.includes(tileIndex) || minesOver) return;
    haptic.tap();

    try {
      const data = await api.post<MinesRevealResult>(
        "/api/demo/mines/reveal",
        { betId: minesBetId, tileIndex },
        { headers: authHeaders }
      );

      if (data.isMine) {
        setMinePositions(data.minePositions ?? []);
        setMinesOver(true);
        haptic.error();
        invalidateBalance();
        toast.error("💥 You hit a mine!");
      } else {
        setMinesRevealedTiles(data.revealedTiles ?? [...minesRevealedTiles, tileIndex]);
        setMinesMultiplier(data.currentMultiplier ?? minesMultiplier);
        haptic.tap();
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Reveal failed");
    }
  };

  const cashoutMines = async () => {
    if (!minesBetId || minesRevealedTiles.length === 0) return;
    setIsLoading(true);
    haptic.impact();
    try {
      const data = await api.post<MinesCashoutResult>(
        "/api/demo/mines/cashout",
        { betId: minesBetId },
        { headers: authHeaders }
      );
      setMinePositions(data.minePositions ?? []);
      setMinesOver(true);
      invalidateBalance();
      haptic.success();
      toast.success(`Cashed out ${fmtVibes(data.payout)} VIBES! 🎉`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Cashout failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderAmountInput = () => (
    <div className="space-y-2">
      <label className="text-gray-400 text-sm">Bet Amount (VIBES)</label>
      <div className="flex gap-2">
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="bg-white/5 border-white/10 text-white text-center text-lg font-bold"
          placeholder="1000"
          min="1000"
        />
      </div>
      <div className="flex gap-2">
        {[1000, 5000, 10000, 100000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(String(v))}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-lg border transition-colors",
              amount === String(v)
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
            )}
          >
            {fmtVibes(String(v))}
          </button>
        ))}
      </div>
    </div>
  );

  const renderHashedSeed = (hashedSeed?: string) => (
    <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Shield className="w-3 h-3 text-green-400" />
        Server Seed Commitment
      </div>
      <p className="font-mono text-xs text-green-400 break-all leading-tight">
        {hashedSeed ?? "..."}
      </p>
    </div>
  );

  // ── Game-specific controls ──────────────────────────────────────────────────

  const renderGameControls = () => {
    switch (gameType) {
      case "coinflip":
        return (
          <div className="space-y-3">
            <div className="flex gap-3">
              {(["heads", "tails"] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => setCoinflipChoice(side)}
                  className={cn(
                    "flex-1 py-3 rounded-xl border font-semibold capitalize transition-all",
                    coinflipChoice === side
                      ? "bg-amber-500/20 border-amber-500/60 text-amber-300"
                      : "bg-white/5 border-white/10 text-gray-400"
                  )}
                >
                  {side === "heads" ? "🦅 Heads" : "🐻 Tails"}
                </button>
              ))}
            </div>
          </div>
        );

      case "crash":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Auto Cashout: <span className="text-white font-bold">{crashAutoCashout}x</span>
              </label>
              <Slider
                value={[crashAutoCashout]}
                min={1.01}
                max={10}
                step={0.01}
                onValueChange={([v]) => setCrashAutoCashout(Math.round(v * 100) / 100)}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1.01x</span>
                <span>10x</span>
              </div>
            </div>
          </div>
        );

      case "roulette":
        return (
          <div className="flex gap-3">
            {(["red", "black"] as const).map((color) => (
              <button
                key={color}
                onClick={() => setRouletteBetColor(color)}
                className={cn(
                  "flex-1 py-3 rounded-xl border font-semibold capitalize transition-all",
                  rouletteBetColor === color
                    ? color === "red"
                      ? "bg-red-500/20 border-red-500/60 text-red-300"
                      : "bg-gray-500/20 border-gray-400/60 text-gray-200"
                    : "bg-white/5 border-white/10 text-gray-400"
                )}
              >
                {color === "red" ? "🔴 Red" : "⚫ Black"}
              </button>
            ))}
          </div>
        );

      case "slots":
        return (
          <p className="text-gray-400 text-sm text-center">
            Spin to win up to 100x your bet!
          </p>
        );

      case "mines":
        return (
          <div className="space-y-3">
            <div>
              <label className="text-gray-400 text-sm mb-2 block">
                Mines: <span className="text-white font-bold">{mineCount}</span>
              </label>
              <div className="flex gap-2">
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMineCount(n)}
                    className={cn(
                      "flex-1 py-2 rounded-lg border text-sm font-bold transition-all",
                      mineCount === n
                        ? "bg-purple-500/20 border-purple-500/60 text-purple-300"
                        : "bg-white/5 border-white/10 text-gray-400"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "poker":
        return (
          <p className="text-gray-400 text-sm text-center">
            Jacks or Better · Draw poker
          </p>
        );

      default:
        return null;
    }
  };

  // ── Mines grid ──────────────────────────────────────────────────────────────

  const renderMinesGrid = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">Current Multiplier</p>
          <p className="text-2xl font-bold text-white">{minesMultiplier.toFixed(2)}x</p>
        </div>
        {renderHashedSeed(minesHashedSeed ?? undefined)}
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: 25 }, (_, i) => {
          const isRevealed = minesRevealedTiles.includes(i);
          const isMine = minePositions.includes(i);
          const isHit = minesOver && isMine;

          return (
            <motion.button
              key={i}
              onClick={() => revealTile(i)}
              disabled={isRevealed || minesOver}
              className={cn(
                "aspect-square rounded-lg border text-lg flex items-center justify-center transition-all",
                isHit
                  ? "bg-red-900/40 border-red-500/60"
                  : isRevealed
                  ? "bg-green-900/40 border-green-500/60"
                  : minesOver
                  ? "bg-white/5 border-white/10 text-white/20"
                  : "bg-white/10 border-white/15 hover:bg-white/15 cursor-pointer"
              )}
              whileTap={!isRevealed && !minesOver ? { scale: 0.9 } : {}}
            >
              {isHit ? "💥" : isRevealed ? "💎" : minesOver ? "⬜" : ""}
            </motion.button>
          );
        })}
      </div>

      {!minesOver && minesRevealedTiles.length > 0 ? (
        <Button
          className="w-full bg-green-500 hover:bg-green-400 text-black font-bold h-11"
          onClick={cashoutMines}
          disabled={isLoading}
        >
          Cash Out {minesMultiplier.toFixed(2)}x 💰
        </Button>
      ) : null}

      {minesOver ? (
        <Button
          className="w-full bg-white/10 hover:bg-white/15 text-white font-bold h-11"
          onClick={() => {
            setPhase("idle");
            setMinesBetId(null);
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Play Again
        </Button>
      ) : null}
    </div>
  );

  // ── Result display ──────────────────────────────────────────────────────────

  const renderResult = () => {
    if (!result) return null;
    const won = result.outcome === "win";

    return (
      <motion.div
        className={cn(
          "rounded-2xl p-4 border space-y-3",
          won
            ? "bg-green-900/30 border-green-500/40"
            : "bg-red-900/20 border-red-500/30"
        )}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-center gap-3">
          {won ? (
            <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400 shrink-0" />
          )}
          <div>
            <p className={cn("font-bold text-lg", won ? "text-green-300" : "text-red-300")}>
              {won ? "You Won!" : "You Lost"}
            </p>
            <p className="text-gray-300 text-sm">
              {won
                ? `+${fmtVibes(result.payout)} VIBES (${result.multiplier}x)`
                : `-${fmtVibes(result.amount ?? "0")} VIBES`}
            </p>
          </div>
        </div>

        {/* Game outcome data */}
        <div className="bg-black/30 rounded-lg p-3 text-xs space-y-1">
          {Object.entries(result.gameData).map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
              <span className="text-white font-mono">{JSON.stringify(v)}</span>
            </div>
          ))}
        </div>

        {/* Provably Fair toggle */}
        <button
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 w-full"
          onClick={() => setShowPF(!showPF)}
        >
          <Shield className="w-3 h-3 text-green-400" />
          Provably Fair Details
          <span className="ml-auto">{showPF ? "▲" : "▼"}</span>
        </button>

        <AnimatePresence>
          {showPF && result.provablyFair ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5 overflow-hidden"
            >
              {[
                ["Hashed Seed", result.provablyFair.hashedSeed],
                ["Client Seed", result.provablyFair.clientSeed],
                ["Nonce", String(result.provablyFair.nonce)],
              ].map(([label, value]) => (
                <div key={label} className="bg-black/30 rounded-lg p-2">
                  <p className="text-gray-500 text-[10px] mb-0.5">{label}</p>
                  <p className="font-mono text-[10px] text-green-400 break-all">{value}</p>
                </div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Button
          className="w-full bg-white/10 hover:bg-white/15 text-white font-bold"
          onClick={() => {
            setResult(null);
            setPhase("idle");
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Play Again
        </Button>
      </motion.div>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/10 hover:bg-white/15">
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <span className="text-xl">{gameIcon(gameType)}</span>
        <div>
          <h2 className="text-white font-bold">{gameLabel(gameType)}</h2>
          <p className="text-xs text-gray-400">
            Balance: {fmtVibes(currentBalance)} VIBES
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {phase === "mines_active" ? (
            <motion.div key="mines" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {renderMinesGrid()}
            </motion.div>
          ) : phase === "result" ? (
            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {renderResult()}
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {renderAmountInput()}
              {renderGameControls()}
              {renderHashedSeed()}
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold h-12 rounded-xl text-base"
                onClick={gameType === "mines" ? startMines : playSingleRound}
                disabled={isLoading}
              >
                {isLoading ? (
                  <motion.div
                    className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  />
                ) : (
                  `Play with VIBES`
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
