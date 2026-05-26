import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface VerificationPanelProps {
  /** Pre-fill from a known bet */
  prefill?: {
    hashedSeed: string;
    clientSeed: string;
    nonce: number;
    gameType: string;
  };
  compact?: boolean;
}

interface VerifyResult {
  seedMatch: boolean;
  hash: string;
  float: number;
  outcome: Record<string, unknown>;
  gameType: string;
}

type GameType = "coinflip" | "roulette" | "slots" | "crash" | "mines" | "poker";

export default function VerificationPanel({
  prefill,
  compact = true,
}: VerificationPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [rawServerSeed, setRawServerSeed] = useState("");
  const [hashedSeed, setHashedSeed] = useState(prefill?.hashedSeed ?? "");
  const [clientSeed, setClientSeed] = useState(prefill?.clientSeed ?? "");
  const [nonce, setNonce] = useState(String(prefill?.nonce ?? "0"));
  const [gameType, setGameType] = useState<GameType>((prefill?.gameType as GameType) ?? "coinflip");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const verify = async () => {
    if (!rawServerSeed || !hashedSeed || !clientSeed) {
      toast.error("Fill in all required fields");
      return;
    }

    setIsVerifying(true);
    try {
      const data = await api.post<VerifyResult>("/api/verification/verify", {
        rawServerSeed,
        hashedSeed,
        clientSeed,
        nonce: parseInt(nonce, 10),
        gameType,
      });
      setResult(data);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-white font-semibold text-sm">Provably Fair Verification</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>

      <AnimatePresence>
        {expanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-3">
              {/* How it works */}
              <div className="bg-green-900/20 rounded-xl p-3 border border-green-500/20">
                <p className="text-green-300 text-xs leading-relaxed">
                  Before each bet, we commit to a hashed server seed. After the game,
                  you can verify the outcome by providing the revealed raw server seed.
                </p>
              </div>

              <div className="space-y-2.5">
                <div>
                  <Label className="text-gray-400 text-xs">Raw Server Seed (post-reveal)</Label>
                  <Input
                    value={rawServerSeed}
                    onChange={(e) => setRawServerSeed(e.target.value)}
                    placeholder="64-char hex seed from post-game reveal"
                    className="bg-white/5 border-white/10 text-white text-xs font-mono mt-1 h-8"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Hashed Server Seed (pre-game)</Label>
                  <Input
                    value={hashedSeed}
                    onChange={(e) => setHashedSeed(e.target.value)}
                    placeholder="sha256 hash shown before game"
                    className="bg-white/5 border-white/10 text-white text-xs font-mono mt-1 h-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-gray-400 text-xs">Client Seed</Label>
                    <Input
                      value={clientSeed}
                      onChange={(e) => setClientSeed(e.target.value)}
                      placeholder="your client seed"
                      className="bg-white/5 border-white/10 text-white text-xs font-mono mt-1 h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-400 text-xs">Nonce</Label>
                    <Input
                      type="number"
                      value={nonce}
                      onChange={(e) => setNonce(e.target.value)}
                      className="bg-white/5 border-white/10 text-white text-xs font-mono mt-1 h-8"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-400 text-xs">Game Type</Label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as GameType)}
                    className="w-full mt-1 h-8 bg-[#1a1a2e] border border-white/10 rounded-md text-white text-xs px-2"
                  >
                    {["coinflip", "crash", "roulette", "slots", "mines", "poker"].map((g) => (
                      <option key={g} value={g} className="bg-[#1a1a2e]">
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                onClick={verify}
                disabled={isVerifying}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold h-9 text-sm"
              >
                {isVerifying ? "Verifying..." : "Verify Game"}
              </Button>

              {/* Result */}
              <AnimatePresence>
                {result ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`rounded-xl p-3 border ${
                      result.seedMatch
                        ? "bg-green-900/20 border-green-500/30"
                        : "bg-red-900/20 border-red-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.seedMatch ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                      <span
                        className={`font-bold text-sm ${
                          result.seedMatch ? "text-green-300" : "text-red-300"
                        }`}
                      >
                        {result.seedMatch ? "Seed Verified ✓" : "Seed Mismatch ✗"}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">HMAC Hash</span>
                        <span className="font-mono text-gray-300 truncate ml-2 max-w-[120px]">
                          {result.hash.slice(0, 16)}…
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Float</span>
                        <span className="font-mono text-gray-300">{result.float.toFixed(8)}</span>
                      </div>
                      {Object.entries(result.outcome).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-gray-400 capitalize">{k}</span>
                          <span className="font-mono text-gray-300">{JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <a
                href="/provably-fair"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 justify-center"
              >
                <ExternalLink className="w-3 h-3" />
                Full verification tool
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
