import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/useAuthStore";

interface ProvablyFair {
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

export interface GameResult {
  betId: string;
  gameType: string;
  outcome: "win" | "loss";
  payout: number;
  multiplier: number;
  newBalance: number;
  provablyFair: ProvablyFair;
  gameData: Record<string, unknown>;
}

export interface MinesStartResult {
  betId: string;
  sessionId: string;
  mineCount: number;
  serverSeedHash: string;
  newBalance: number;
  gridSize: number;
}

export interface MinesRevealResult {
  hit: boolean;
  tileIndex: number;
  revealedSafe?: number[];
  minePositions?: number[];
  currentMultiplier?: number;
  remainingSafe?: number;
  outcome?: string;
  payout?: number;
}

export interface MinesCashoutResult {
  outcome: string;
  payout: number;
  multiplier: number;
  minePositions: number[];
  newBalance: number;
  provablyFair: ProvablyFair;
}

export interface Card {
  rank: string;
  suit: string;
}

export interface PokerDealResult {
  betId: string;
  serverSeedHash: string;
  initialHand: Card[];
  newBalance: number;
}

export interface PokerDrawResult {
  finalHand: Card[];
  handRank: string;
  payoutMultiplier: number;
  payout: number;
  outcome: "win" | "loss";
  newBalance: number;
  provablyFair: ProvablyFair;
}

export interface JackpotBetResult {
  betId: string;
  tickets: number;
  poolTotal: number;
  newBalance: number;
  jackpotResult: unknown | null;
}

export interface JackpotState {
  sessionId?: string;
  pool: number;
  participants: { username: string; amount: number; tickets: number }[];
  threshold: number;
  serverSeedHash?: string;
}

export interface HistoryBet {
  id: string;
  gameType: string;
  amount: number;
  currency: string;
  outcome: string | null;
  payout: number | null;
  multiplier: number | null;
  verifiable: boolean;
  serverSeedHash: string;
  sessionStatus: string;
  createdAt: string;
}

function useAuthHeaders(): Record<string, string> {
  const token = useAuthStore((s) => s.token);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useCoinflip() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ amount, choice }: { amount: number; choice: "heads" | "tails" }) =>
      api.post<GameResult>("/api/games/coinflip/play", { amount, betData: { choice } }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      if (data.outcome === "win") {
        toast.success(`Won $${data.payout.toFixed(2)}!`, { description: `${data.multiplier}x multiplier` });
      } else {
        toast.error("No win this round", { description: "Better luck next time!" });
      }
    },
    onError: (err: Error) => toast.error("Bet failed", { description: err.message }),
  });
}

export function useRoulette() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({
      amount,
      bets,
    }: {
      amount: number;
      bets: { type: string; value: number; numbers?: number[] }[];
    }) =>
      api.post<GameResult>("/api/games/roulette/play", { amount, betData: { bets } }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      if (data.outcome === "win") {
        toast.success(`Won $${data.payout.toFixed(2)}!`, { description: `Landed on ${(data.gameData as { number?: number }).number}` });
      } else {
        toast.error("No win", { description: `Landed on ${(data.gameData as { number?: number }).number}` });
      }
    },
    onError: (err: Error) => toast.error("Bet failed", { description: err.message }),
  });
}

export function useSlots() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ amount }: { amount: number }) =>
      api.post<GameResult>("/api/games/slots/play", { amount }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      if (data.outcome === "win") {
        toast.success(`Won $${data.payout.toFixed(2)}!`, { description: `${data.multiplier}x multiplier` });
      }
    },
    onError: (err: Error) => toast.error("Bet failed", { description: err.message }),
  });
}

export function useCrash() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ amount, autoCashout }: { amount: number; autoCashout: number }) =>
      api.post<GameResult>("/api/games/crash/play", { amount, betData: { autoCashout } }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      if (data.outcome === "win") {
        toast.success(`Cashed out at ${data.multiplier}x!`, { description: `Won $${data.payout.toFixed(2)}` });
      } else {
        const gd = data.gameData as { crashPoint?: number };
        toast.error(`Crashed at ${gd.crashPoint?.toFixed(2)}x`, { description: "Better luck next time!" });
      }
    },
    onError: (err: Error) => toast.error("Bet failed", { description: err.message }),
  });
}

export function useMinesGame() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({
      amount,
      mineCount,
      clientSeed,
    }: { amount: number; mineCount: number; clientSeed?: string }) =>
      api.post<MinesStartResult>(
        "/api/games/mines/start",
        { amount, betData: { mineCount, clientSeed } },
        { headers }
      ),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
    },
    onError: (err: Error) => toast.error("Failed to start game", { description: err.message }),
  });
}

export function useMinesReveal() {
  const headers = useAuthHeaders();
  return useMutation({
    mutationFn: ({ betId, tileIndex }: { betId: string; tileIndex: number }) =>
      api.post<MinesRevealResult>("/api/games/mines/reveal", { betId, tileIndex }, { headers }),
    onError: (err: Error) => toast.error("Reveal failed", { description: err.message }),
  });
}

export function useMinesCashout() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ betId }: { betId: string }) =>
      api.post<MinesCashoutResult>("/api/games/mines/cashout", { betId }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      toast.success(`Cashed out $${data.payout.toFixed(2)}!`, {
        description: `${data.multiplier}x multiplier`,
      });
    },
    onError: (err: Error) => toast.error("Cashout failed", { description: err.message }),
  });
}

export function usePokerDeal() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ amount, clientSeed }: { amount: number; clientSeed?: string }) =>
      api.post<PokerDealResult>(
        "/api/games/poker/deal",
        { amount, betData: { clientSeed } },
        { headers }
      ),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
    },
    onError: (err: Error) => toast.error("Deal failed", { description: err.message }),
  });
}

export function usePokerDraw() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ betId, heldIndices }: { betId: string; heldIndices: number[] }) =>
      api.post<PokerDrawResult>("/api/games/poker/draw", { betId, heldIndices }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      if (data.outcome === "win") {
        toast.success(`${data.handRank}!`, { description: `Won $${data.payout.toFixed(2)}` });
      } else {
        toast.error(data.handRank, { description: "No win this hand" });
      }
    },
    onError: (err: Error) => toast.error("Draw failed", { description: err.message }),
  });
}

export function useJackpotBet() {
  const headers = useAuthHeaders();
  const updateBalance = useAuthStore((s) => s.updateBalance);
  return useMutation({
    mutationFn: ({ amount }: { amount: number }) =>
      api.post<JackpotBetResult>("/api/games/jackpot/bet", { amount }, { headers }),
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      toast.success(`${data.tickets} ticket(s) added!`, {
        description: `Pool is now $${data.poolTotal.toFixed(2)}`,
      });
    },
    onError: (err: Error) => toast.error("Bet failed", { description: err.message }),
  });
}

export function useJackpotState() {
  return useQuery({
    queryKey: ["jackpot", "current"],
    queryFn: () => api.get<JackpotState>("/api/games/jackpot/current"),
    refetchInterval: 5000,
  });
}

export function useGameHistory(gameType?: string) {
  const token = useAuthStore((s) => s.token);
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const endpoint = gameType ? `/api/games/${gameType}/history` : "/api/games/history";
  return useQuery({
    queryKey: ["game-history", gameType ?? "all"],
    queryFn: () =>
      api.get<{ bets: HistoryBet[]; pagination: { total: number } }>(endpoint, { headers }),
    enabled: !!token,
    staleTime: 10000,
  });
}
