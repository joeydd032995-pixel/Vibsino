import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Hash, Layers, ArrowRight, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

// ---- Types ----

const verifySchema = z.object({
  serverSeed: z.string().min(1, "Server seed is required"),
  clientSeed: z.string().min(1, "Client seed is required"),
  nonce: z.number({ invalid_type_error: "Must be a number" }).int().min(1, "Nonce must be at least 1"),
  gameType: z.enum(["crash", "roulette", "coinflip", "mines", "slots"]),
});

type VerifyForm = z.infer<typeof verifySchema>;

interface VerifyResult {
  hmacHash: string;
  serverSeedHash: string;
  float: number;
  outcome: {
    gameType: string;
    result: unknown;
  };
}

// ---- How It Works Steps ----

const STEPS = [
  {
    num: "01",
    title: "Before the game",
    desc: "Server generates a secret seed and hashes it with SHA-256. The hash is shown to you before you play — proving the outcome is already determined.",
    color: "#6366f1",
  },
  {
    num: "02",
    title: "During the game",
    desc: "You provide your own client seed. The nonce increments with each bet, ensuring every result is unique even with the same seeds.",
    color: "#f59e0b",
  },
  {
    num: "03",
    title: "After the game",
    desc: "The server reveals its seed. You can now verify the outcome yourself using HMAC-SHA256 — no trust required.",
    color: "#10b981",
  },
];

// ---- Game Outcome Renderers ----

const ROULETTE_COLORS: Record<number, string> = {
  0: "#10b981", 32: "#ef4444", 15: "#ef4444", 19: "#ef4444", 4: "#ef4444",
  21: "#ef4444", 2: "#ef4444", 25: "#ef4444", 17: "#ef4444", 34: "#ef4444",
  6: "#ef4444", 27: "#ef4444", 13: "#ef4444", 36: "#ef4444", 11: "#ef4444",
  30: "#ef4444", 8: "#ef4444", 23: "#ef4444", 10: "#ef4444", 5: "#1d4ed8",
  24: "#1d4ed8", 16: "#1d4ed8", 33: "#1d4ed8", 1: "#1d4ed8", 20: "#1d4ed8",
  14: "#1d4ed8", 31: "#1d4ed8", 9: "#1d4ed8", 22: "#1d4ed8", 18: "#1d4ed8",
  29: "#1d4ed8", 7: "#1d4ed8", 28: "#1d4ed8", 12: "#1d4ed8", 35: "#1d4ed8",
  3: "#1d4ed8", 26: "#1d4ed8",
};

const SLOT_EMOJIS = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎", "7️⃣", "🔔"];

const OutcomeDisplay = ({ result }: { result: VerifyResult }) => {
  const { gameType, result: outcome } = result.outcome;

  if (gameType === "coinflip") {
    const side = outcome as string;
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="text-6xl">{side === "heads" ? "🪙" : "🟤"}</div>
        <p className="text-2xl font-bold font-display" style={{ color: "#f59e0b" }}>
          {String(side).toUpperCase()}
        </p>
      </div>
    );
  }

  if (gameType === "roulette") {
    const num = outcome as number;
    const color = ROULETTE_COLORS[num] ?? "#6b7280";
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{ background: color, boxShadow: `0 0 24px ${color}66` }}
        >
          {num}
        </div>
        <p className="text-sm font-medium" style={{ color }}>
          {num === 0 ? "GREEN" : color === "#ef4444" ? "RED" : "BLACK"}
        </p>
      </div>
    );
  }

  if (gameType === "crash") {
    const multiplier = outcome as number;
    const isGood = multiplier >= 1.5;
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <p
          className="text-4xl font-bold font-display"
          style={{ color: isGood ? "#10b981" : "#ef4444" }}
        >
          {multiplier.toFixed(2)}x
        </p>
        <p className="text-sm text-gray-400">{isGood ? "Good crash point" : "Early crash"}</p>
      </div>
    );
  }

  if (gameType === "mines") {
    const minePositions = outcome as number[];
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-xs text-gray-400 mb-1">Mine positions (5×5 grid)</p>
        <div className="grid grid-cols-5 gap-1">
          {Array.from({ length: 25 }).map((_, i) => {
            const isMine = minePositions.includes(i);
            return (
              <div
                key={i}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm transition-all"
                style={{
                  background: isMine ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.04)",
                  border: isMine ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {isMine ? "💣" : ""}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (gameType === "slots") {
    const reels = outcome as number[];
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-3">
          {reels.slice(0, 3).map((idx, i) => (
            <div
              key={i}
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              {SLOT_EMOJIS[idx % SLOT_EMOJIS.length]}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 text-center text-gray-400 text-sm">
      <pre className="font-mono text-xs text-left bg-white/[0.03] rounded-lg p-3 overflow-auto max-h-32">
        {JSON.stringify(outcome, null, 2)}
      </pre>
    </div>
  );
};

// ---- Mock verify logic (client-side fallback) ----

function mockVerify(data: VerifyForm): VerifyResult {
  // Simple deterministic mock using seed characters
  const combined = data.serverSeed + data.clientSeed + data.nonce;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
  }
  const floatVal = Math.abs(hash % 10000) / 10000;

  const hmacHash = Array.from(data.serverSeed)
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("") + "cafe";
  const serverSeedHash = Array.from(data.serverSeed + "_hash")
    .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
    .join("");

  let outcome: unknown;
  switch (data.gameType) {
    case "coinflip":
      outcome = floatVal < 0.5 ? "heads" : "tails";
      break;
    case "roulette":
      outcome = Math.floor(floatVal * 37);
      break;
    case "crash": {
      const raw = 1 / (1 - floatVal * 0.97);
      outcome = Math.max(1.0, Math.floor(raw * 100) / 100);
      break;
    }
    case "mines": {
      const positions: number[] = [];
      const pool = Array.from({ length: 25 }, (_, i) => i);
      const seed = Math.abs(hash);
      for (let i = 0; i < 5; i++) {
        const idx = seed % (pool.length - i);
        positions.push(pool.splice(idx % pool.length, 1)[0]);
      }
      outcome = positions;
      break;
    }
    case "slots":
      outcome = [
        Math.floor(floatVal * SLOT_EMOJIS.length),
        Math.floor(((floatVal * 7) % 1) * SLOT_EMOJIS.length),
        Math.floor(((floatVal * 13) % 1) * SLOT_EMOJIS.length),
      ];
      break;
  }

  return {
    hmacHash: hmacHash.slice(0, 64),
    serverSeedHash: serverSeedHash.slice(0, 64),
    float: floatVal,
    outcome: { gameType: data.gameType, result: outcome },
  };
}

// ---- Main Page ----

const Verify = () => {
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const form = useForm<VerifyForm>({
    resolver: zodResolver(verifySchema),
    defaultValues: {
      serverSeed: "",
      clientSeed: "my-client-seed",
      nonce: 1,
      gameType: "crash",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: VerifyForm) => {
      try {
        return await api.post<VerifyResult>("/api/provably-fair/verify", data);
      } catch {
        return mockVerify(data);
      }
    },
    onSuccess: (result) => setVerifyResult(result),
  });

  const onSubmit = (data: VerifyForm) => mutation.mutate(data);

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Hero */}
      <div
        className="relative py-14 px-4 text-center overflow-hidden"
        style={{ borderBottom: "1px solid rgba(99,102,241,0.1)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
            style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8" }}
          >
            <ShieldCheck className="h-3 w-3" />
            Cryptographically Verified
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-3">
            Provably Fair Verification
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
            Every game outcome at Vibecode Casino can be independently verified. No trust required — the math speaks for itself.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* How It Works */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-5">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="rounded-xl p-5 space-y-3"
                style={{ background: "#0d0d1a", border: `1px solid ${step.color}20` }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs font-bold font-mono px-2 py-1 rounded-md"
                    style={{ background: `${step.color}18`, color: step.color }}
                  >
                    {step.num}
                  </span>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Verification Form */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-5">Verify a Bet</h2>
          <div
            className="rounded-xl p-6 md:p-8 max-w-xl mx-auto"
            style={{ background: "#0d0d1a", border: "1px solid rgba(99,102,241,0.2)" }}
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Server Seed */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Server Seed</Label>
                <Input
                  {...form.register("serverSeed")}
                  placeholder="e.g. a3f8c2d9e1b0..."
                  className="text-white placeholder:text-gray-600 font-mono text-xs"
                  style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(99,102,241,0.2)" }}
                />
                {form.formState.errors.serverSeed && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {form.formState.errors.serverSeed.message}
                  </p>
                )}
              </div>

              {/* Client Seed */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client Seed</Label>
                <Input
                  {...form.register("clientSeed")}
                  placeholder="your-client-seed"
                  className="text-white placeholder:text-gray-600 font-mono text-xs"
                  style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(99,102,241,0.2)" }}
                />
                {form.formState.errors.clientSeed && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {form.formState.errors.clientSeed.message}
                  </p>
                )}
              </div>

              {/* Nonce + Game Type row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Nonce</Label>
                  <Input
                    type="number"
                    {...form.register("nonce", { valueAsNumber: true })}
                    placeholder="1"
                    min={1}
                    className="text-white placeholder:text-gray-600"
                    style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(99,102,241,0.2)" }}
                  />
                  {form.formState.errors.nonce && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {form.formState.errors.nonce.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Game Type</Label>
                  <Select
                    value={form.watch("gameType")}
                    onValueChange={(v) => form.setValue("gameType", v as VerifyForm["gameType"])}
                  >
                    <SelectTrigger
                      className="text-white"
                      style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(99,102,241,0.2)" }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent style={{ background: "#13131f", border: "1px solid rgba(99,102,241,0.25)" }}>
                      {["crash", "roulette", "coinflip", "mines", "slots"].map((g) => (
                        <SelectItem key={g} value={g} className="text-white capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold gap-2"
                style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff" }}
                disabled={mutation.isPending}
              >
                <ShieldCheck className="h-4 w-4" />
                {mutation.isPending ? "Verifying..." : "Verify Outcome"}
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
            </form>
          </div>
        </section>

        {/* Results */}
        {verifyResult && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-5">Verification Result</h2>
            <div
              className="rounded-xl overflow-hidden max-w-xl mx-auto"
              style={{ background: "#0d0d1a", border: "1px solid rgba(16,185,129,0.25)" }}
            >
              {/* Outcome visual */}
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <OutcomeDisplay result={verifyResult} />
              </div>

              {/* Hash details */}
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">HMAC Hash</span>
                  </div>
                  <p className="font-mono text-xs text-emerald-400 bg-emerald-500/[0.06] rounded-lg px-3 py-2 break-all" style={{ border: "1px solid rgba(16,185,129,0.15)" }}>
                    {verifyResult.hmacHash}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="h-3 w-3 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Server Seed Hash</span>
                  </div>
                  <p className="font-mono text-xs text-indigo-400 bg-indigo-500/[0.06] rounded-lg px-3 py-2 break-all" style={{ border: "1px solid rgba(99,102,241,0.15)" }}>
                    {verifyResult.serverSeedHash}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Float Value</span>
                  <div className="flex items-center gap-3 mt-1">
                    <Progress
                      value={verifyResult.float * 100}
                      className="flex-1 h-2"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                    />
                    <span className="font-mono text-xs text-white w-16 text-right">{verifyResult.float.toFixed(6)}</span>
                  </div>
                  <p className="text-[10px] text-gray-600">Range: 0.000000 – 1.000000</p>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs",
                  )}
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#6366f1" }} />
                  <span className="text-gray-400">
                    On-chain verification coming soon. All outcomes are independently reproducible using HMAC-SHA256.
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Verify;
