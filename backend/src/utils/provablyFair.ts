/**
 * provablyFair.ts
 *
 * Comprehensive Provably Fair utilities for the F2P/demo layer.
 * Wraps existing hash.ts utilities and adds:
 *  - DB-backed ServerSeed lifecycle (generate → commit → reveal)
 *  - Multi-game result computation
 *  - Public verification (post-reveal)
 */

import crypto from "crypto";
import { db } from "../lib/db";
import {
  generateServerSeed,
  hashServerSeed,
  generateGameHash,
} from "./hash";
import { hashToFloat } from "../services/provablyFairService";
import { playCrash } from "../engines/crash";
import { playCoinflip } from "../engines/coinflip";
import { spinRoulette } from "../engines/roulette";
import { placeMines } from "../engines/mines";
import { spinSlots } from "../engines/slots";
import { dealPokerHand } from "../engines/poker";

/** Game types supported in the F2P layer */
export type F2PGameType =
  | "coinflip"
  | "roulette"
  | "slots"
  | "crash"
  | "mines"
  | "poker";

/** Opaque seed record returned to client (never exposes rawSeed) */
export interface StoredSeedPublic {
  seedId: string;
  hashedSeed: string;
  nonce: number;
}

/** Full result from a provably fair computation */
export interface ProvablyFairResult {
  hash: string;
  float: number; // primary float ∈ [0, 1)
  outcome: Record<string, unknown>;
  multiplier: number;
  won: boolean;
}

/** Result returned by verifyProvablyFair */
export interface VerificationResult {
  seedMatch: boolean;
  result: ProvablyFairResult;
}

// ─── Seed Lifecycle ─────────────────────────────────────────────────────────

/**
 * Generate a fresh server seed, hash it, and persist to DB.
 * NEVER returns rawSeed — only the public commitment.
 */
export async function generateAndStoreServerSeed(
  userId: string
): Promise<StoredSeedPublic> {
  const rawSeed = generateServerSeed();
  const hashedSeed = hashServerSeed(rawSeed);

  const record = await db.serverSeed.create({
    data: { userId, rawSeed, hashedSeed, nonce: 0 },
  });

  return { seedId: record.id, hashedSeed, nonce: 0 };
}

/**
 * Reveal the raw server seed after a mandatory delay.
 * Fire-and-forget — does NOT block the game response.
 * Minimum delay is enforced to prevent timing attacks.
 */
export function revealServerSeed(
  seedId: string,
  delayMs = 3000
): void {
  const actualDelay = Math.max(3000, delayMs);
  setTimeout(async () => {
    try {
      const record = await db.serverSeed.findUnique({ where: { id: seedId } });
      if (!record || record.revealedSeed) return; // already revealed or missing
      await db.serverSeed.update({
        where: { id: seedId },
        data: { revealedSeed: record.rawSeed, revealedAt: new Date() },
      });
    } catch {
      // Best-effort: log but don't crash
      console.error(`[provablyFair] Failed to reveal seed ${seedId}`);
    }
  }, actualDelay);
}

/**
 * Increment the nonce on a ServerSeed record after each bet.
 */
export async function incrementSeedNonce(seedId: string): Promise<number> {
  const updated = await db.serverSeed.update({
    where: { id: seedId },
    data: { nonce: { increment: 1 } },
  });
  return updated.nonce;
}

/**
 * Get the active (non-revealed) server seed for a user,
 * or create a new one if none exists.
 */
export async function getOrCreateActiveSeed(
  userId: string
): Promise<StoredSeedPublic> {
  const existing = await db.serverSeed.findFirst({
    where: { userId, revealedSeed: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return {
      seedId: existing.id,
      hashedSeed: existing.hashedSeed,
      nonce: existing.nonce,
    };
  }

  return generateAndStoreServerSeed(userId);
}

// ─── HMAC Wrapper ────────────────────────────────────────────────────────────

/** Thin wrapper around hash.ts generateGameHash for naming consistency */
export function createHMAC(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): string {
  return generateGameHash(serverSeed, clientSeed, nonce);
}

// ─── Multi-Game Result Computation ──────────────────────────────────────────

/**
 * Compute a provably fair game result from raw seeds.
 * Reuses existing game engines — no duplicate logic.
 */
export function getProvablyFairResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  gameType: F2PGameType,
  betData?: Record<string, unknown>
): ProvablyFairResult {
  const hash = createHMAC(serverSeed, clientSeed, nonce);
  const float = hashToFloat(hash);

  switch (gameType) {
    case "coinflip": {
      const result = playCoinflip({
        serverSeed,
        clientSeed,
        nonce,
        choice: (betData?.choice as "heads" | "tails") ?? "heads",
      });
      const won = result.win;
      return {
        hash,
        float,
        outcome: {
          result: result.result,
          choice: betData?.choice ?? "heads",
          float,
        },
        multiplier: won ? result.multiplier : 0,
        won,
      };
    }

    case "crash": {
      const result = playCrash({ serverSeed, clientSeed, nonce });
      const autoCashout =
        typeof betData?.autoCashout === "number" ? betData.autoCashout : 2;
      const won = result.crashPoint >= autoCashout;
      const multiplier = won ? autoCashout : 0;
      return {
        hash,
        float,
        outcome: { crashPoint: result.crashPoint, autoCashout, float },
        multiplier,
        won,
      };
    }

    case "roulette": {
      const result = spinRoulette(serverSeed, clientSeed, nonce);
      // For demo roulette we simplify to a red/black bet
      const betColor = (betData?.betColor as string) ?? "red";
      const won =
        betColor === "red"
          ? result.color === "red"
          : betColor === "black"
          ? result.color === "black"
          : false;
      return {
        hash,
        float,
        outcome: {
          number: result.number,
          color: result.color,
          isOdd: result.isOdd,
          isHigh: result.isHigh,
          betColor,
          float,
        },
        multiplier: won ? 2 : 0,
        won,
      };
    }

    case "slots": {
      const result = spinSlots(serverSeed, clientSeed, nonce);
      const won = result.payoutMultiplier > 0;
      return {
        hash,
        float,
        outcome: {
          reels: result.reels,
          payoutMultiplier: result.payoutMultiplier,
          float,
        },
        multiplier: result.payoutMultiplier,
        won,
      };
    }

    case "mines": {
      const mineCount =
        typeof betData?.mineCount === "number" ? betData.mineCount : 3;
      const result = placeMines({ serverSeed, clientSeed, nonce, mineCount });
      return {
        hash,
        float,
        outcome: {
          minePositions: result.minePositions,
          mineCount,
          float,
        },
        multiplier: 1, // Mines payout is computed tile-by-tile, not here
        won: false, // Determined by reveal flow
      };
    }

    case "poker": {
      const result = dealPokerHand(serverSeed, clientSeed, nonce);
      return {
        hash,
        float,
        outcome: {
          initialHand: result.initialHand,
          float,
        },
        multiplier: 1, // Poker payout determined at draw phase
        won: false,
      };
    }

    default: {
      return { hash, float, outcome: { float }, multiplier: 0, won: false };
    }
  }
}

// ─── Public Verification ─────────────────────────────────────────────────────

/**
 * Verify a provably fair result using the raw server seed (post-reveal).
 * The player provides the rawServerSeed they received after reveal.
 * We re-hash it and check it matches the hashedSeed they recorded upfront.
 */
export function verifyProvablyFair(
  rawServerSeed: string,
  hashedSeed: string,
  clientSeed: string,
  nonce: number,
  gameType: F2PGameType,
  betData?: Record<string, unknown>
): VerificationResult {
  const computedHash = crypto
    .createHash("sha256")
    .update(rawServerSeed)
    .digest("hex");

  const seedMatch = computedHash === hashedSeed;

  const result = getProvablyFairResult(
    rawServerSeed,
    clientSeed,
    nonce,
    gameType,
    betData
  );

  return { seedMatch, result };
}
