import crypto from "crypto";
import type { Server as IOServer } from "socket.io";

function createId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
import { db } from "../lib/db";
import { addBalance, subtractBalance } from "./balanceService";
import { playCrash } from "../engines/crash";
import {
  generateServerSeed,
  hashServerSeed,
  generateClientSeed,
} from "../utils/hash";

// ── Types ──────────────────────────────────────────────────────────────────

export interface InMemoryCrashBet {
  betId: string;
  userId: string;
  username: string;
  amount: number;
  autoCashout: number;
  cashedOut: boolean;
  cashoutMultiplier: number | null;
  payout: number | null;
}

interface CrashRound {
  id: string;
  status: "waiting" | "betting" | "flying" | "crashed";
  crashPoint: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  flyingStartMs: number | null;
  bets: InMemoryCrashBet[];
}

// ── Multiplier math ────────────────────────────────────────────────────────

/** Time (ms) elapsed → current multiplier. Grows ~2x at 30s, ~4x at 60s. */
export function getMultiplierAt(elapsedMs: number): number {
  return Math.round(Math.pow(1.0024, elapsedMs / 100) * 100) / 100;
}

/** Milliseconds needed to reach a target multiplier. */
function msToReachMultiplier(target: number): number {
  return (Math.log(target) / Math.log(1.0024)) * 100;
}

// ── Round durations ─────────────────────────────────────────────────────────
const WAITING_MS = 3_000;
const BETTING_MS = 8_000;
const TICK_INTERVAL_MS = 100;

// ── Singleton manager ───────────────────────────────────────────────────────

class CrashRoundManager {
  private io: IOServer | null = null;
  private round: CrashRound | null = null;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private phaseTimeout: ReturnType<typeof setTimeout> | null = null;

  setIO(io: IOServer) {
    this.io = io;
    // kick off first round after a short delay so socket server is ready
    setTimeout(() => this.startWaiting(), 500);
  }

  getCurrentRound(): (Omit<CrashRound, "serverSeed" | "crashPoint"> & {
    currentMultiplier: number;
    elapsedMs: number;
  }) | null {
    if (!this.round) return null;
    const r = this.round;
    const elapsed =
      r.flyingStartMs !== null ? Date.now() - r.flyingStartMs : 0;
    const currentMultiplier =
      r.status === "flying" ? getMultiplierAt(elapsed) : 1.0;
    return {
      id: r.id,
      status: r.status,
      serverSeedHash: r.serverSeedHash,
      clientSeed: r.clientSeed,
      nonce: r.nonce,
      flyingStartMs: r.flyingStartMs,
      bets: r.bets.map((b) => ({
        ...b,
        // hide payout until resolved
        payout: b.cashedOut ? b.payout : null,
      })),
      currentMultiplier,
      elapsedMs: elapsed,
    };
  }

  // ── Phase transitions ─────────────────────────────────────────────────────

  private startWaiting() {
    this._clearTimers();
    const r = this.round;
    const prevCrashPoint = r?.status === "crashed" ? r.crashPoint : null;
    const prevServerSeed = r?.status === "crashed" ? r.serverSeed : null;

    // Prepare next round seeds now (published in startBetting)
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);
    const clientSeed = generateClientSeed();
    const nonce = 0;
    const { crashPoint } = playCrash({ serverSeed, clientSeed, nonce });

    this.round = {
      id: createId(),
      status: "waiting",
      crashPoint,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      flyingStartMs: null,
      bets: [],
    };

    this.io?.to("crash").emit("crash:waiting", {
      nextRoundIn: WAITING_MS,
      prevCrashPoint,
      prevServerSeed,
    });

    this.phaseTimeout = setTimeout(() => this.startBetting(), WAITING_MS);
  }

  private startBetting() {
    if (!this.round) return;
    this.round.status = "betting";
    const bettingEndsAt = Date.now() + BETTING_MS;

    this.io?.to("crash").emit("crash:betting", {
      roundId: this.round.id,
      serverSeedHash: this.round.serverSeedHash,
      bettingEndsAt,
    });

    this.phaseTimeout = setTimeout(() => this.startFlying(), BETTING_MS);
  }

  private startFlying() {
    if (!this.round) return;
    this.round.status = "flying";
    this.round.flyingStartMs = Date.now();

    this.io?.to("crash").emit("crash:flying", {
      roundId: this.round.id,
      startTime: this.round.flyingStartMs,
    });

    const crashMs = msToReachMultiplier(this.round.crashPoint);

    this.tickInterval = setInterval(() => this.tick(crashMs), TICK_INTERVAL_MS);
  }

  private tick(crashMs: number) {
    if (!this.round || this.round.flyingStartMs === null) return;

    const elapsed = Date.now() - this.round.flyingStartMs;
    const multiplier = getMultiplierAt(elapsed);

    // Auto-cashouts
    for (const bet of this.round.bets) {
      if (!bet.cashedOut && multiplier >= bet.autoCashout) {
        this._cashOutBet(bet, bet.autoCashout);
      }
    }

    this.io?.to("crash").emit("crash:tick", {
      multiplier,
      elapsed,
    });

    if (elapsed >= crashMs) {
      this.endRound();
    }
  }

  private async endRound() {
    this._clearTimers();
    if (!this.round) return;

    this.round.status = "crashed";
    const { crashPoint, serverSeed, serverSeedHash, bets, id } = this.round;

    // Cash out any remaining (they lose — emit before updating)
    this.io?.to("crash").emit("crash:crashed", {
      roundId: id,
      crashPoint,
      serverSeed,
      serverSeedHash,
      bets: bets.map((b) => ({
        userId: b.userId,
        username: b.username,
        amount: b.amount,
        cashedOut: b.cashedOut,
        cashoutMultiplier: b.cashoutMultiplier,
        payout: b.payout,
      })),
    });

    // Persist all bets to DB
    await this._persistRound();

    // Pause then restart
    this.phaseTimeout = setTimeout(() => this.startWaiting(), WAITING_MS);
  }

  // ── Bet handling ──────────────────────────────────────────────────────────

  async placeBet(
    userId: string,
    username: string,
    amount: number,
    autoCashout: number
  ) {
    if (!this.round || this.round.status !== "betting") {
      throw new Error("Betting is not open right now");
    }

    // Rate limit: 1 bet per round per user
    if (this.round.bets.some((b) => b.userId === userId)) {
      throw new Error("You have already placed a bet this round");
    }

    // Deduct balance
    const { user } = await subtractBalance(userId, amount, "bet");

    const bet: InMemoryCrashBet = {
      betId: createId(),
      userId,
      username,
      amount,
      autoCashout,
      cashedOut: false,
      cashoutMultiplier: null,
      payout: null,
    };
    this.round.bets.push(bet);

    this.io?.to("crash").emit("crash:bet_placed", {
      userId,
      username,
      amount,
      autoCashout,
    });

    return { betId: bet.betId, newBalance: user.balance }; // user.balance already decremented
  }

  manualCashout(userId: string): { multiplier: number; payout: number } {
    if (!this.round || this.round.status !== "flying") {
      throw new Error("Game is not in flying phase");
    }
    const bet = this.round.bets.find(
      (b) => b.userId === userId && !b.cashedOut
    );
    if (!bet) {
      throw new Error("No active bet found or already cashed out");
    }

    const elapsed = this.round.flyingStartMs
      ? Date.now() - this.round.flyingStartMs
      : 0;
    const multiplier = getMultiplierAt(elapsed);

    this._cashOutBet(bet, multiplier);

    return { multiplier, payout: bet.payout! };
  }

  private _cashOutBet(bet: InMemoryCrashBet, multiplier: number) {
    if (bet.cashedOut) return;
    const payout = bet.amount * multiplier;
    bet.cashedOut = true;
    bet.cashoutMultiplier = multiplier;
    bet.payout = payout;

    // Credit balance (fire and forget — non-blocking)
    addBalance(bet.userId, payout, "win").catch(console.error);

    this.io?.to("crash").emit("crash:cashout", {
      userId: bet.userId,
      username: bet.username,
      multiplier,
      payout,
    });
  }

  // ── DB persistence ─────────────────────────────────────────────────────────

  private async _persistRound() {
    if (!this.round) return;
    const { serverSeed, serverSeedHash, clientSeed, nonce, crashPoint, bets } =
      this.round;

    if (bets.length === 0) return; // Nothing to persist

    try {
      // Create a single GameSession for this crash round
      const session = await db.gameSession.create({
        data: {
          gameType: "crash",
          status: "completed",
          serverSeed,
          serverSeedHash,
          clientSeed,
          nonce,
          houseEdge: 0.01,
          result: JSON.stringify({ crashPoint }),
        },
      });

      // Create all bets
      for (const bet of bets) {
        await db.bet.create({
          data: {
            id: bet.betId,
            userId: bet.userId,
            gameSessionId: session.id,
            amount: bet.amount,
            currency: "USDC",
            betData: JSON.stringify({ autoCashout: bet.autoCashout }),
            outcome: bet.cashedOut ? "win" : "loss",
            payout: bet.payout ?? 0,
            multiplier: bet.cashoutMultiplier ?? 0,
            verifiable: true,
          },
        });
      }
    } catch (err) {
      console.error("[CrashService] Failed to persist round:", err);
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  private _clearTimers() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.phaseTimeout) {
      clearTimeout(this.phaseTimeout);
      this.phaseTimeout = null;
    }
  }
}

export const crashRoundManager = new CrashRoundManager();
