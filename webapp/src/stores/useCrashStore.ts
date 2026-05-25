import { create } from "zustand";

export interface CrashBetDisplay {
  userId: string;
  username: string;
  amount: number;
  autoCashout: number;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  payout: number | null;
}

export type CrashStatus = "waiting" | "betting" | "flying" | "crashed";

interface CrashState {
  status: CrashStatus;
  multiplier: number;
  elapsed: number;
  crashPoint: number | null;
  serverSeedHash: string | null;
  serverSeed: string | null;
  bets: CrashBetDisplay[];
  myBet: CrashBetDisplay | null;
  lastCrashPoint: number | null;
  bettingEndsAt: number | null;
  roundId: string | null;

  // Actions
  setStatus: (status: CrashStatus) => void;
  setMultiplier: (multiplier: number, elapsed: number) => void;
  setCrashedState: (
    crashPoint: number,
    serverSeed: string,
    serverSeedHash: string,
    bets: CrashBetDisplay[]
  ) => void;
  setBettingState: (roundId: string, serverSeedHash: string, bettingEndsAt: number) => void;
  setWaitingState: (prevCrashPoint: number | null, prevServerSeed: string | null) => void;
  setFlyingState: () => void;
  addBet: (bet: CrashBetDisplay) => void;
  markCashedOut: (userId: string, multiplier: number, payout: number) => void;
  setMyBet: (bet: CrashBetDisplay | null) => void;
  hydrateRound: (state: {
    status: CrashStatus;
    serverSeedHash: string | null;
    bets: CrashBetDisplay[];
    currentMultiplier: number;
    elapsed: number;
    roundId: string;
    bettingEndsAt?: number | null;
  }) => void;
}

export const useCrashStore = create<CrashState>((set, get) => ({
  status: "waiting",
  multiplier: 1.0,
  elapsed: 0,
  crashPoint: null,
  serverSeedHash: null,
  serverSeed: null,
  bets: [],
  myBet: null,
  lastCrashPoint: null,
  bettingEndsAt: null,
  roundId: null,

  setStatus: (status) => set({ status }),

  setMultiplier: (multiplier, elapsed) => set({ multiplier, elapsed }),

  setCrashedState: (crashPoint, serverSeed, serverSeedHash, bets) =>
    set({
      status: "crashed",
      crashPoint,
      serverSeed,
      serverSeedHash,
      lastCrashPoint: crashPoint,
      bets,
      multiplier: crashPoint,
    }),

  setBettingState: (roundId, serverSeedHash, bettingEndsAt) =>
    set({
      status: "betting",
      roundId,
      serverSeedHash,
      serverSeed: null,
      crashPoint: null,
      bets: [],
      myBet: null,
      multiplier: 1.0,
      elapsed: 0,
      bettingEndsAt,
    }),

  setWaitingState: (prevCrashPoint, _prevServerSeed) =>
    set((s) => ({
      status: "waiting",
      lastCrashPoint: prevCrashPoint ?? s.lastCrashPoint,
      bets: [],
      myBet: null,
      multiplier: 1.0,
      elapsed: 0,
      bettingEndsAt: null,
    })),

  setFlyingState: () => set({ status: "flying", bettingEndsAt: null }),

  addBet: (bet) =>
    set((s) => ({
      bets: [...s.bets, bet],
      myBet:
        bet.userId === s.myBet?.userId ? bet : s.myBet,
    })),

  markCashedOut: (userId, multiplier, payout) =>
    set((s) => ({
      bets: s.bets.map((b) =>
        b.userId === userId
          ? { ...b, cashedOut: true, cashoutMultiplier: multiplier, payout }
          : b
      ),
      myBet:
        s.myBet?.userId === userId
          ? { ...s.myBet, cashedOut: true, cashoutMultiplier: multiplier, payout }
          : s.myBet,
    })),

  setMyBet: (bet) => set({ myBet: bet }),

  hydrateRound: (state) =>
    set({
      status: state.status,
      serverSeedHash: state.serverSeedHash,
      bets: state.bets,
      multiplier: state.currentMultiplier,
      elapsed: state.elapsed,
      roundId: state.roundId,
      bettingEndsAt: state.bettingEndsAt ?? null,
    }),
}));
