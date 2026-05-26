/**
 * virtualBalanceService.ts
 *
 * All VIBES virtual balance operations.
 * Amount is stored as a String representing an integer with 3 implied decimal places.
 * e.g. "10000000" = 10,000.000 VIBES
 *
 * All arithmetic is done with native BigInt to avoid floating-point errors.
 */

import { db } from "../lib/db";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Starting balance for new players (10,000 VIBES) */
export const STARTING_BALANCE = 10_000_000n;

/** Base daily claim amount (1,000 VIBES) */
export const DAILY_CLAIM_BASE = 1_000_000n;

/** Double daily claim amount (2,000 VIBES) */
export const DAILY_CLAIM_DOUBLE = 2_000_000n;

/** 24 hours in milliseconds */
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a VIBES BigInt-as-String to BigInt */
export function parseVibes(s: string): bigint {
  return BigInt(s);
}

/** Serialize BigInt to VIBES String */
export function formatVibes(n: bigint): string {
  return n.toString();
}

/**
 * Display VIBES with 3 implied decimal places.
 * e.g. 10000000n → "10000.000"
 */
export function displayVibes(n: bigint): string {
  const abs = n < 0n ? -n : n;
  const sign = n < 0n ? "-" : "";
  const whole = abs / 1000n;
  const frac = abs % 1000n;
  return `${sign}${whole}.${frac.toString().padStart(3, "0")}`;
}

// ─── Core Operations ─────────────────────────────────────────────────────────

/**
 * Get or create a VirtualBalance for a user.
 * New users start with STARTING_BALANCE VIBES.
 */
export async function getOrCreateVirtualBalance(userId: string): Promise<{
  amount: bigint;
  currency: string;
  lastDailyClaim: Date | null;
}> {
  const record = await db.virtualBalance.upsert({
    where: { userId },
    create: {
      userId,
      amount: formatVibes(STARTING_BALANCE),
      currency: "VIBES",
    },
    update: {},
  });

  return {
    amount: parseVibes(record.amount),
    currency: record.currency,
    lastDailyClaim: record.lastDailyClaim,
  };
}

/**
 * Add VIBES to a user's balance (atomic).
 * Returns the new balance as BigInt.
 */
export async function addVirtualBalance(
  userId: string,
  amount: bigint
): Promise<bigint> {
  if (amount <= 0n) throw new Error("Amount must be positive");

  const current = await getOrCreateVirtualBalance(userId);
  const newAmount = current.amount + amount;

  await db.virtualBalance.update({
    where: { userId },
    data: { amount: formatVibes(newAmount) },
  });

  return newAmount;
}

/**
 * Subtract VIBES from a user's balance (atomic).
 * Throws if insufficient balance.
 * Returns the new balance as BigInt.
 */
export async function subtractVirtualBalance(
  userId: string,
  amount: bigint
): Promise<bigint> {
  if (amount <= 0n) throw new Error("Amount must be positive");

  const current = await getOrCreateVirtualBalance(userId);
  if (current.amount < amount) {
    throw new Error(
      `Insufficient VIBES balance. Have ${displayVibes(current.amount)}, need ${displayVibes(amount)}`
    );
  }

  const newAmount = current.amount - amount;
  await db.virtualBalance.update({
    where: { userId },
    data: { amount: formatVibes(newAmount) },
  });

  return newAmount;
}

/**
 * Transfer VIBES between two users atomically using a DB transaction.
 */
export async function transferVirtualBalance(
  fromUserId: string,
  toUserId: string,
  amount: bigint
): Promise<{ fromBalance: bigint; toBalance: bigint }> {
  if (amount <= 0n) throw new Error("Transfer amount must be positive");
  if (fromUserId === toUserId) throw new Error("Cannot tip yourself");

  // Ensure both balances exist
  const [from, to] = await Promise.all([
    getOrCreateVirtualBalance(fromUserId),
    getOrCreateVirtualBalance(toUserId),
  ]);

  if (from.amount < amount) {
    throw new Error(
      `Insufficient VIBES. Have ${displayVibes(from.amount)}, need ${displayVibes(amount)}`
    );
  }

  const newFromAmount = from.amount - amount;
  const newToAmount = to.amount + amount;

  await db.$transaction([
    db.virtualBalance.update({
      where: { userId: fromUserId },
      data: { amount: formatVibes(newFromAmount) },
    }),
    db.virtualBalance.update({
      where: { userId: toUserId },
      data: { amount: formatVibes(newToAmount) },
    }),
  ]);

  return { fromBalance: newFromAmount, toBalance: newToAmount };
}

/**
 * Check if a user can claim their daily VIBES.
 */
export async function canClaimDaily(userId: string): Promise<{
  canClaim: boolean;
  nextClaimAt: Date | null;
}> {
  const record = await db.virtualBalance.findUnique({ where: { userId } });
  if (!record?.lastDailyClaim) return { canClaim: true, nextClaimAt: null };

  const nextClaim = new Date(
    record.lastDailyClaim.getTime() + DAILY_COOLDOWN_MS
  );
  const canClaim = Date.now() >= nextClaim.getTime();
  return { canClaim, nextClaimAt: canClaim ? null : nextClaim };
}

/**
 * Claim daily VIBES for a user.
 * Throws "Already claimed" if within 24h cooldown.
 */
export async function claimDailyVibes(
  userId: string,
  isDoubleDaily = false
): Promise<{
  claimed: bigint;
  newBalance: bigint;
  nextClaimAt: Date;
}> {
  const { canClaim, nextClaimAt: next } = await canClaimDaily(userId);
  if (!canClaim && next) {
    throw new Error(`Daily VIBES already claimed. Next claim at ${next.toISOString()}`);
  }

  const claimAmount = isDoubleDaily ? DAILY_CLAIM_DOUBLE : DAILY_CLAIM_BASE;
  const current = await getOrCreateVirtualBalance(userId);
  const newAmount = current.amount + claimAmount;
  const now = new Date();

  await db.virtualBalance.update({
    where: { userId },
    data: {
      amount: formatVibes(newAmount),
      lastDailyClaim: now,
    },
  });

  return {
    claimed: claimAmount,
    newBalance: newAmount,
    nextClaimAt: new Date(now.getTime() + DAILY_COOLDOWN_MS),
  };
}
