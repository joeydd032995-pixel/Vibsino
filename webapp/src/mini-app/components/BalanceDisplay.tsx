import { motion, AnimatePresence } from "framer-motion";
import { Coins, Clock, Gift, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDailyClaim } from "../hooks/useDailyClaim";
import { cn } from "@/lib/utils";

interface BalanceDisplayProps {
  amount: string;
  currency?: string;
  nextClaimAt: string | null;
  canClaim: boolean;
  onClaim?: () => void;
}

/** Convert BigInt-as-String to display string: "10000000" → "10,000.000" */
function formatVibesDisplay(amount: string): string {
  try {
    const n = BigInt(amount);
    const whole = n / 1000n;
    const frac = n % 1000n;
    return (
      whole.toLocaleString("en-US") +
      "." +
      frac.toString().padStart(3, "0")
    );
  } catch {
    return "0.000";
  }
}

export default function BalanceDisplay({
  amount,
  currency = "VIBES",
  nextClaimAt,
  canClaim,
}: BalanceDisplayProps) {
  const { claim, isClaimLoading, countdown } = useDailyClaim(nextClaimAt);

  return (
    <div className="space-y-4">
      {/* Main balance card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 via-[#1a1a2e] to-[#0f0f1a] border border-amber-500/20 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Glowing background blob */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 text-amber-400/70 text-sm mb-2">
            <Coins className="w-4 h-4" />
            <span>{currency} Balance</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={amount}
              className="text-4xl font-bold text-white tabular-nums"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              {formatVibesDisplay(amount)}
            </motion.div>
          </AnimatePresence>

          <p className="text-amber-400/50 text-xs mt-1">
            Free-to-Play chips · No real money
          </p>
        </div>
      </motion.div>

      {/* Daily Claim button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {canClaim ? (
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold h-12 rounded-xl text-base"
            onClick={() => claim()}
            disabled={isClaimLoading}
          >
            {isClaimLoading ? (
              <span className="flex items-center gap-2">
                <motion.div
                  className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                Claiming...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Claim Daily VIBES
              </span>
            )}
          </Button>
        ) : (
          <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>Next claim in</span>
            </div>
            <span className="font-mono text-amber-400 font-bold tabular-nums">
              {countdown}
            </span>
          </div>
        )}
      </motion.div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className={cn("flex items-center gap-1.5 text-xs text-gray-400 mb-1")}>
            <Zap className="w-3 h-3 text-amber-400" />
            Daily Claim
          </div>
          <p className="text-white font-semibold text-sm">1,000 VIBES</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/10">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
            <Gift className="w-3 h-3 text-amber-400" />
            VIP Bonus
          </div>
          <p className="text-white font-semibold text-sm">2x Daily</p>
        </div>
      </div>
    </div>
  );
}
