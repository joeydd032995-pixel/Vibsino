import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { toast } from "sonner";

type GameType = "crash" | "roulette" | "coinflip" | "mines" | "slots" | "jackpot" | "poker";

interface VerifyResult {
  valid: boolean;
  hash: string;
  serverSeedHash: string;
  float: number;
  outcome: Record<string, unknown>;
}

interface BetLookup {
  betId: string;
  gameType: string;
  serverSeed: string | null;
  serverSeedHash: string;
  clientSeed: string | null;
  nonce: number;
  status: string;
}

const ProvablyFairVerify = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("0");
  const [gameType, setGameType] = useState<GameType>("coinflip");
  const [mineCount, setMineCount] = useState("3");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [betIdInput, setBetIdInput] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed) {
      toast.error("Enter server seed and client seed");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<VerifyResult>("/api/provably-fair/verify", {
        serverSeed,
        clientSeed,
        nonce: parseInt(nonce) || 0,
        gameType,
        mineCount: gameType === "mines" ? parseInt(mineCount) || 3 : undefined,
      });
      setResult(res);
    } catch (err) {
      toast.error("Verification failed", { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const handleBetLookup = async () => {
    if (!betIdInput) return;
    setLookupLoading(true);
    try {
      const res = await api.get<BetLookup>(`/api/games/bet/${betIdInput}`);
      if (!res.serverSeed) {
        toast.info("Game still active — server seed revealed after completion");
        return;
      }
      setServerSeed(res.serverSeed);
      setClientSeed(res.clientSeed ?? "");
      setNonce(String(res.nonce));
      setGameType(res.gameType as GameType);
      toast.success("Bet data loaded — click Verify to check");
    } catch (err) {
      toast.error("Bet not found", { description: (err as Error).message });
    } finally {
      setLookupLoading(false);
    }
  };

  const GAME_TYPES: GameType[] = ["coinflip", "crash", "roulette", "mines", "slots", "poker", "jackpot"];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#0a0a0f" }}>
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="flex items-center gap-3 mb-6">
            <Link to="/lobby">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <ShieldCheck className="h-6 w-6 text-amber-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Provably Fair Verification</h1>
              <p className="text-xs text-gray-500">Verify any game outcome cryptographically</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
            {/* Verification form */}
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
            >
              <h2 className="text-sm font-semibold text-gray-300">Verify a Round</h2>

              {/* Bet ID lookup */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Load from Bet ID</label>
                <div className="flex gap-2">
                  <Input
                    value={betIdInput}
                    onChange={(e) => setBetIdInput(e.target.value)}
                    placeholder="Enter bet ID..."
                    className="bg-black/30 border-white/10 text-white text-xs"
                  />
                  <Button
                    onClick={handleBetLookup}
                    disabled={lookupLoading || !betIdInput}
                    size="sm"
                    variant="outline"
                    className="border-white/10 text-gray-300 shrink-0"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-gray-600 mt-1">Server seed only shown for completed games</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 text-xs text-gray-600" style={{ background: "rgba(13,13,20,0.9)" }}>
                    or enter manually
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Game Type</label>
                <div className="flex gap-1.5 flex-wrap">
                  {GAME_TYPES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setGameType(g)}
                      className="px-2.5 py-1 rounded-lg text-xs capitalize transition-all"
                      style={{
                        background: gameType === g ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${gameType === g ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                        color: gameType === g ? "#f59e0b" : "#9ca3af",
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Server Seed</label>
                <Input
                  value={serverSeed}
                  onChange={(e) => setServerSeed(e.target.value)}
                  placeholder="64-character hex string..."
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1.5 block">Client Seed</label>
                <Input
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  placeholder="Client seed..."
                  className="bg-black/30 border-white/10 text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block">Nonce</label>
                  <Input
                    type="number"
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    min="0"
                    className="bg-black/30 border-white/10 text-white"
                  />
                </div>
                {gameType === "mines" && (
                  <div>
                    <label className="text-xs text-gray-500 mb-1.5 block">Mine Count</label>
                    <Input
                      type="number"
                      value={mineCount}
                      onChange={(e) => setMineCount(e.target.value)}
                      min="1"
                      max="24"
                      className="bg-black/30 border-white/10 text-white"
                    />
                  </div>
                )}
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading}
                className="w-full h-11 font-semibold"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0a0a0f" }}
              >
                {loading ? "Verifying..." : "Verify Round"}
              </Button>
            </div>

            {/* Result + info */}
            <div className="space-y-4">
              {/* Verification result */}
              <AnimatePresence>
                {result && result.valid && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5 space-y-3"
                    style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-semibold text-green-400">Verification Passed ✓</span>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div>
                        <span className="text-gray-500">Hash: </span>
                        <span className="text-gray-300 break-all">{result.hash}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Server Seed Hash: </span>
                        <span className="text-gray-300 break-all">{result.serverSeedHash}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Float value: </span>
                        <span className="text-gray-300">{result.float.toFixed(10)}</span>
                      </div>
                    </div>

                    <div
                      className="rounded-lg p-3"
                      style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <p className="text-xs text-gray-400 mb-2 font-semibold">Outcome:</p>
                      <pre className="text-xs text-green-300 whitespace-pre-wrap break-all">
                        {JSON.stringify(result.outcome, null, 2)}
                      </pre>
                    </div>
                  </motion.div>
                )}
                {result && !result.valid && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5 space-y-3"
                    style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-red-400" />
                      <span className="text-sm font-semibold text-red-400">Verification Failed ✗</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      The provided seeds do not reproduce the recorded outcome. This round may have been tampered with.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* How it works */}
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ background: "rgba(13,13,20,0.9)", border: "1px solid rgba(245,158,11,0.1)" }}
              >
                <h3 className="text-sm font-semibold text-gray-300">How Provably Fair Works</h3>
                <div className="space-y-3 text-xs text-gray-400">
                  <div className="flex gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
                    >1</span>
                    <p>Before each game, the server generates a <strong className="text-gray-300">server seed</strong> and publishes its <strong className="text-gray-300">SHA-256 hash</strong> — so it cannot be changed retroactively.</p>
                  </div>
                  <div className="flex gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
                    >2</span>
                    <p>You provide a <strong className="text-gray-300">client seed</strong> (customizable). Together with a nonce, these produce an <strong className="text-gray-300">HMAC-SHA256 hash</strong>.</p>
                  </div>
                  <div className="flex gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}
                    >3</span>
                    <p>After the game, the server reveals its seed. You can verify the hash matches and replay the exact game outcome using this tool.</p>
                  </div>
                </div>

                <div
                  className="rounded-lg p-3 text-xs font-mono"
                  style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245,158,11,0.08)" }}
                >
                  <span className="text-gray-500">hash = </span>
                  <span className="text-amber-400">HMAC-SHA256</span>
                  <span className="text-gray-300">(serverSeed, </span>
                  <span className="text-green-400">`{'${clientSeed}:${nonce}'}`</span>
                  <span className="text-gray-300">)</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProvablyFairVerify;
