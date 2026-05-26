import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Gamepad2, Shield, Send } from "lucide-react";
import TelegramProvider from "./TelegramProvider";
import { useTelegram } from "./context/TelegramContext";
import BalanceDisplay from "./components/BalanceDisplay";
import GameSelector, { MiniGameType } from "./components/GameSelector";
import DemoGameWrapper from "./components/DemoGameWrapper";
import TipModal from "./components/TipModal";
import VerificationPanel from "./components/VerificationPanel";
import { useVirtualBalance } from "./hooks/useVirtualBalance";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";

type Tab = "balance" | "games" | "verify" | "tips";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "balance", label: "Balance", icon: <Coins className="w-5 h-5" /> },
  { id: "games", label: "Games", icon: <Gamepad2 className="w-5 h-5" /> },
  { id: "verify", label: "Verify", icon: <Shield className="w-5 h-5" /> },
  { id: "tips", label: "Tips", icon: <Send className="w-5 h-5" /> },
];

function MiniAppInner() {
  const [activeTab, setActiveTab] = useState<Tab>("balance");
  const [selectedGame, setSelectedGame] = useState<MiniGameType | null>(null);
  const [tipModalOpen, setTipModalOpen] = useState(false);

  const { setBackButtonHandler } = useTelegram();
  const user = useAuthStore((s) => s.user);
  const { balance, currency, canClaim, nextClaimAt, isLoading } =
    useVirtualBalance();

  // Handle back button when a game is selected
  useEffect(() => {
    if (selectedGame) {
      setBackButtonHandler(() => setSelectedGame(null));
    } else {
      setBackButtonHandler(null);
    }
    return () => setBackButtonHandler(null);
  }, [selectedGame, setBackButtonHandler]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-6xl">🎰</div>
        <h1 className="text-2xl font-bold text-white text-center">Vibsino Free Play</h1>
        <p className="text-gray-400 text-center text-sm max-w-xs">
          Sign in to your Vibsino account to play free games and earn VIBES!
        </p>
        <Button
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 h-12 rounded-xl"
          onClick={() => (window.location.href = "/auth")}
        >
          Sign In to Play
        </Button>
      </div>
    );
  }

  if (selectedGame) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <DemoGameWrapper
          gameType={selectedGame}
          onBack={() => setSelectedGame(null)}
          currentBalance={balance}
        />
      </div>
    );
  }

  const displayBalance = (() => {
    try {
      return (BigInt(balance) / 1000n).toLocaleString();
    } catch {
      return "0";
    }
  })();

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Vibsino Free</h1>
          <p className="text-xs text-gray-400">Welcome, {user.username} 👋</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5">
          <p className="text-amber-400 text-xs font-bold">
            {isLoading ? "..." : `${displayBalance} VIBES`}
          </p>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 px-4">
        <AnimatePresence mode="wait">
          {activeTab === "balance" ? (
            <motion.div
              key="balance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <BalanceDisplay
                amount={balance}
                currency={currency}
                nextClaimAt={nextClaimAt}
                canClaim={canClaim}
              />
            </motion.div>
          ) : activeTab === "games" ? (
            <motion.div
              key="games"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <GameSelector onSelectGame={setSelectedGame} />
            </motion.div>
          ) : activeTab === "verify" ? (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-white font-bold text-lg">Provably Fair</h2>
              <p className="text-gray-400 text-sm">
                Verify any game result using our open HMAC-SHA256 algorithm.
              </p>
              <VerificationPanel compact={false} />
            </motion.div>
          ) : (
            <motion.div
              key="tips"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <h2 className="text-white font-bold text-lg">Send Tips &amp; Boosts</h2>
              <p className="text-gray-400 text-sm">
                Send VIBES to other players or unlock premium features.
              </p>
              <Button
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold h-12 rounded-xl"
                onClick={() => setTipModalOpen(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Send VIBES / Buy Boost
              </Button>
              <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
                <p className="text-white font-semibold text-sm">About VIBES</p>
                <ul className="text-gray-400 text-xs space-y-1">
                  <li>• Free-to-play virtual currency</li>
                  <li>• Claim 1,000 VIBES every 24 hours</li>
                  <li>• VIP: 2x daily claims (50,000 VIBES)</li>
                  <li>• Send tips to other players</li>
                  <li>• All games are provably fair</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-safe">
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all ${
                activeTab === tab.id ? "text-amber-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tip Modal */}
      <TipModal
        open={tipModalOpen}
        onOpenChange={setTipModalOpen}
        currentBalance={balance}
      />
    </div>
  );
}

export default function MiniApp() {
  return (
    <TelegramProvider>
      <MiniAppInner />
    </TelegramProvider>
  );
}
