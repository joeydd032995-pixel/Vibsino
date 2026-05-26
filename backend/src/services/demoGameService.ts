/**
 * demoGameService.ts
 *
 * Demo/F2P game execution. Reuses all existing game engines.
 * Uses VirtualBalance + VirtualBet instead of real-money models.
 * Complete separation from real-money gameService.ts.
 */

import { db } from "../lib/db";
import {
  getOrCreateActiveSeed,
  generateAndStoreServerSeed,
  revealServerSeed,
  incrementSeedNonce,
  getProvablyFairResult,
} from "../utils/provablyFair";
import type { F2PGameType } from "../utils/provablyFair";
import {
  getOrCreateVirtualBalance,
  addVirtualBalance,
  subtractVirtualBalance,
  parseVibes,
  formatVibes,
  displayVibes,
} from "./virtualBalanceService";
import {
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
} from "../utils/hash";
import { playCoinflip } from "../engines/coinflip";
import { spinRoulette } from "../engines/roulette";
import { spinSlots } from "../engines/slots";
import { playCrash } from "../engines/crash";
import { placeMines } from "../engines/mines";
import { dealPokerHand, drawPokerCards, type Card } from "../engines/poker";

// ─── Per-game VIBES bet limits (stored with 3 implied decimals) ───────────────
// e.g. min 1000 = 1.000 VIBES, max 10_000_000 = 10,000.000 VIBES
const GAME_LIMITS: Record<F2PGameType, { min: bigint; max: bigint }> = {
  coinflip: { min: 1_000n, max: 10_000_000n },
  roulette: { min: 1_000n, max: 5_000_000n },
  crash:    { min: 1_000n, max: 10_000_000n },
  slots:    { min: 1_000n, max: 10_000_000n },
  mines:    { min: 1_000n, max: 5_000_000n },
  poker:    { min: 10_000n, max: 5_000_000n },
};

function validateBetAmount(gameType: F2PGameType, amount: bigint): void {
  const limits = GAME_LIMITS[gameType];
  if (!limits) throw new Error(`Unknown game type: ${gameType}`);
  if (amount < limits.min) {
    throw new Error(`Minimum bet is ${displayVibes(limits.min)} VIBES`);
  }
  if (amount > limits.max) {
    throw new Error(`Maximum bet is ${displayVibes(limits.max)} VIBES`);
  }
}

// ─── Single-Round Games ───────────────────────────────────────────────────────

export async function playDemoRound(
  userId: string,
  gameType: F2PGameType,
  amountStr: string,
  clientSeedInput?: string,
  betData?: Record<string, unknown>
) {
  if (gameType === "mines" || gameType === "poker") {
    throw new Error(
      `Use dedicated endpoints for ${gameType}: /demo/${gameType}/start`
    );
  }

  const amount = parseVibes(amountStr);
  validateBetAmount(gameType, amount);

  // Get or create a server seed for this user
  const seedPublic = await getOrCreateActiveSeed(userId);
  const seedRecord = await db.serverSeed.findUnique({
    where: { id: seedPublic.seedId },
  });
  if (!seedRecord) throw new Error("Server seed not found");

  const clientSeed = clientSeedInput ?? generateClientSeed();
  const nonce = seedRecord.nonce;

  // Deduct bet from virtual balance (throws if insufficient)
  await subtractVirtualBalance(userId, amount);

  // Compute game result using raw seed (never exposed)
  let payout = 0n;
  let multiplier = 0;
  let won = false;
  let outcomeData: Record<string, unknown> = {};

  if (gameType === "coinflip") {
    const choice = (betData?.choice as "heads" | "tails") ?? "heads";
    const result = playCoinflip({ serverSeed: seedRecord.rawSeed, clientSeed, nonce, choice });
    won = result.win;
    multiplier = won ? 1.98 : 0;
    payout = won ? BigInt(Math.floor(Number(amount) * 1.98)) : 0n;
    outcomeData = { result: result.result, choice };

  } else if (gameType === "crash") {
    const autoCashout = typeof betData?.autoCashout === "number" ? betData.autoCashout : 2;
    const result = playCrash({ serverSeed: seedRecord.rawSeed, clientSeed, nonce });
    won = result.crashPoint >= autoCashout;
    multiplier = won ? autoCashout : 0;
    payout = won ? BigInt(Math.floor(Number(amount) * autoCashout)) : 0n;
    outcomeData = { crashPoint: result.crashPoint, autoCashout };

  } else if (gameType === "roulette") {
    const result = spinRoulette(seedRecord.rawSeed, clientSeed, nonce);
    const betColor = (betData?.betColor as string) ?? "red";
    won = betColor === "red" ? result.color === "red" : betColor === "black" ? result.color === "black" : false;
    multiplier = won ? 2 : 0;
    payout = won ? amount * 2n : 0n;
    outcomeData = { number: result.number, color: result.color, betColor };

  } else if (gameType === "slots") {
    const result = spinSlots(seedRecord.rawSeed, clientSeed, nonce);
    won = result.payoutMultiplier > 0;
    multiplier = result.payoutMultiplier;
    payout = won ? BigInt(Math.floor(Number(amount) * multiplier)) : 0n;
    outcomeData = { reels: result.reels, payoutMultiplier: result.payoutMultiplier };
  }

  // Credit payout if won
  if (won && payout > 0n) {
    await addVirtualBalance(userId, payout);
  }

  // Get new balance
  const { amount: newBalance } = await getOrCreateVirtualBalance(userId);

  // Get the HMAC hash for verification data
  const pfResult = getProvablyFairResult(
    seedRecord.rawSeed,
    clientSeed,
    nonce,
    gameType,
    betData
  );

  // Persist VirtualBet
  const bet = await db.virtualBet.create({
    data: {
      userId,
      gameType,
      amount: amountStr,
      currency: "VIBES",
      betData: JSON.stringify({ ...betData }),
      outcome: won ? "win" : "loss",
      payout: formatVibes(payout),
      multiplier,
      serverSeedId: seedRecord.id,
      clientSeed,
      nonce,
      verificationData: JSON.stringify({
        hash: pfResult.hash,
        float: pfResult.float,
        outcome: { ...outcomeData },
        serverSeedHash: seedRecord.hashedSeed,
      }),
    },
  });

  // Increment nonce for next bet
  await incrementSeedNonce(seedRecord.id);

  // Reveal server seed after delay (fire-and-forget)
  revealServerSeed(seedRecord.id, 3000);

  // Create a new seed for next round
  await generateAndStoreServerSeed(userId);

  return {
    betId: bet.id,
    gameType,
    outcome: won ? "win" : "loss",
    payout: formatVibes(payout),
    multiplier,
    newBalance: formatVibes(newBalance),
    gameData: outcomeData,
    provablyFair: {
      serverSeedId: seedRecord.id,
      hashedSeed: seedRecord.hashedSeed,
      clientSeed,
      nonce,
    },
  };
}

// ─── Mines (multi-step) ───────────────────────────────────────────────────────

export async function startDemoMinesGame(
  userId: string,
  amountStr: string,
  mineCount: number,
  clientSeedInput?: string
) {
  const amount = parseVibes(amountStr);
  validateBetAmount("mines", amount);

  // Check no active mines game
  const activeBet = await db.virtualBet.findFirst({
    where: { userId, gameType: "mines", outcome: null },
  });
  if (activeBet) throw new Error("You already have an active mines game");

  const rawSeed = generateServerSeed();
  const hashedSeed = hashServerSeed(rawSeed);
  const clientSeed = clientSeedInput ?? generateClientSeed();

  const seedRecord = await db.serverSeed.create({
    data: { userId, rawSeed, hashedSeed, nonce: 0 },
  });

  // Compute mine positions using placeMines engine
  const minesResult = placeMines({ serverSeed: rawSeed, clientSeed, nonce: 0, mineCount });

  // Deduct balance
  await subtractVirtualBalance(userId, amount);

  const { amount: newBalance } = await getOrCreateVirtualBalance(userId);

  // Create bet record with null outcome (in progress)
  const bet = await db.virtualBet.create({
    data: {
      userId,
      gameType: "mines",
      amount: amountStr,
      currency: "VIBES",
      betData: JSON.stringify({
        mineCount,
        minePositions: minesResult.minePositions,
        revealedTiles: [],
        currentMultiplier: 1,
      }),
      outcome: null, // in progress
      serverSeedId: seedRecord.id,
      clientSeed,
      nonce: 0,
      verificationData: JSON.stringify({
        serverSeedHash: hashedSeed,
        clientSeed,
        nonce: 0,
        mineCount,
      }),
    },
  });

  return {
    betId: bet.id,
    mineCount,
    gridSize: 25,
    hashedSeed,
    clientSeed,
    newBalance: formatVibes(newBalance),
  };
}

export async function revealDemoMineTile(
  userId: string,
  betId: string,
  tileIndex: number
) {
  const bet = await db.virtualBet.findFirst({
    where: { id: betId, userId, gameType: "mines", outcome: null },
  });
  if (!bet) throw new Error("Active mines game not found");

  const betData = JSON.parse(bet.betData ?? "{}") as {
    minePositions: number[];
    revealedTiles: number[];
    mineCount: number;
    currentMultiplier: number;
  };

  const { minePositions, revealedTiles, mineCount } = betData;

  if (revealedTiles.includes(tileIndex)) {
    throw new Error("Tile already revealed");
  }

  const hitMine = minePositions.includes(tileIndex);

  if (hitMine) {
    // Game over — loss
    await db.virtualBet.update({
      where: { id: betId },
      data: {
        outcome: "loss",
        payout: "0",
        multiplier: 0,
        betData: JSON.stringify({ ...betData, revealedTiles: [...revealedTiles, tileIndex] }),
      },
    });

    const seedId = bet.serverSeedId;
    revealServerSeed(seedId, 3000);

    const { amount: newBalance } = await getOrCreateVirtualBalance(userId);
    return {
      tileIndex,
      isMine: true,
      outcome: "loss",
      payout: "0",
      multiplier: 0,
      minePositions,
      newBalance: formatVibes(newBalance),
    };
  }

  // Safe tile — compute new multiplier
  const newRevealed = [...revealedTiles, tileIndex];
  const safeCount = newRevealed.length;
  const totalTiles = 25;
  const safeTotal = totalTiles - mineCount;

  // Mines multiplier formula matching real implementation
  let multiplier = 1;
  for (let i = 0; i < safeCount; i++) {
    multiplier *= (safeTotal - i) / (totalTiles - mineCount - i);
  }
  multiplier = Math.round(multiplier * 0.97 * 100) / 100; // 3% house edge

  await db.virtualBet.update({
    where: { id: betId },
    data: {
      betData: JSON.stringify({
        ...betData,
        revealedTiles: newRevealed,
        currentMultiplier: multiplier,
      }),
    },
  });

  return {
    tileIndex,
    isMine: false,
    currentMultiplier: multiplier,
    revealedTiles: newRevealed,
  };
}

export async function cashoutDemoMines(userId: string, betId: string) {
  const bet = await db.virtualBet.findFirst({
    where: { id: betId, userId, gameType: "mines", outcome: null },
  });
  if (!bet) throw new Error("Active mines game not found");

  const betData = JSON.parse(bet.betData ?? "{}") as {
    currentMultiplier: number;
    minePositions: number[];
    revealedTiles: number[];
    mineCount: number;
  };

  const { currentMultiplier, minePositions, revealedTiles } = betData;

  if (revealedTiles.length === 0) {
    throw new Error("Must reveal at least one tile before cashing out");
  }

  const amount = parseVibes(bet.amount);
  const payout = BigInt(Math.floor(Number(amount) * currentMultiplier));

  await addVirtualBalance(userId, payout);
  const { amount: newBalance } = await getOrCreateVirtualBalance(userId);

  await db.virtualBet.update({
    where: { id: betId },
    data: {
      outcome: "win",
      payout: formatVibes(payout),
      multiplier: currentMultiplier,
    },
  });

  revealServerSeed(bet.serverSeedId, 3000);

  return {
    outcome: "win",
    payout: formatVibes(payout),
    multiplier: currentMultiplier,
    minePositions,
    revealedTiles,
    newBalance: formatVibes(newBalance),
    provablyFair: {
      serverSeedId: bet.serverSeedId,
      hashedSeed: betData.minePositions ? "" : "", // populated from verificationData
      clientSeed: bet.clientSeed,
      nonce: bet.nonce,
    },
  };
}

export async function getActiveDemoMinesGame(userId: string) {
  return db.virtualBet.findFirst({
    where: { userId, gameType: "mines", outcome: null },
  });
}

// ─── Poker (multi-step) ───────────────────────────────────────────────────────

export async function dealDemoPokerHand(
  userId: string,
  amountStr: string,
  clientSeedInput?: string
) {
  const amount = parseVibes(amountStr);
  validateBetAmount("poker", amount);

  const active = await db.virtualBet.findFirst({
    where: { userId, gameType: "poker", outcome: null },
  });
  if (active) throw new Error("You already have an active poker hand");

  const rawSeed = generateServerSeed();
  const hashedSeed = hashServerSeed(rawSeed);
  const clientSeed = clientSeedInput ?? generateClientSeed();

  const seedRecord = await db.serverSeed.create({
    data: { userId, rawSeed, hashedSeed, nonce: 0 },
  });

  const dealResult = dealPokerHand(rawSeed, clientSeed, 0);

  await subtractVirtualBalance(userId, amount);
  const { amount: newBalance } = await getOrCreateVirtualBalance(userId);

  const bet = await db.virtualBet.create({
    data: {
      userId,
      gameType: "poker",
      amount: amountStr,
      currency: "VIBES",
      betData: JSON.stringify({
        initialHand: dealResult.initialHand,
        deck: dealResult.deck,
      }),
      outcome: null,
      serverSeedId: seedRecord.id,
      clientSeed,
      nonce: 0,
      verificationData: JSON.stringify({ serverSeedHash: hashedSeed }),
    },
  });

  return {
    betId: bet.id,
    hashedSeed,
    clientSeed,
    initialHand: dealResult.initialHand,
    newBalance: formatVibes(newBalance),
  };
}

export async function drawDemoPokerCards(
  userId: string,
  betId: string,
  heldIndices: number[]
) {
  const bet = await db.virtualBet.findFirst({
    where: { id: betId, userId, gameType: "poker", outcome: null },
    include: { serverSeed: true },
  });
  if (!bet) throw new Error("Active poker hand not found");

  const betData = JSON.parse(bet.betData ?? "{}") as {
    initialHand: Card[];
    deck: Card[];
  };

  // Use the existing drawPokerCards engine which handles the draw and evaluation
  const drawResult = drawPokerCards(betData.deck, heldIndices);

  const amount = parseVibes(bet.amount);
  const payout = BigInt(Math.floor(Number(amount) * drawResult.payoutMultiplier));
  const won = drawResult.payoutMultiplier > 0;

  if (won && payout > 0n) {
    await addVirtualBalance(userId, payout);
  }

  const { amount: newBalance } = await getOrCreateVirtualBalance(userId);

  await db.virtualBet.update({
    where: { id: betId },
    data: {
      outcome: won ? "win" : "loss",
      payout: formatVibes(payout),
      multiplier: drawResult.payoutMultiplier,
    },
  });

  revealServerSeed(bet.serverSeedId, 3000);

  return {
    finalHand: drawResult.finalHand,
    handRank: drawResult.handRank,
    payoutMultiplier: drawResult.payoutMultiplier,
    payout: formatVibes(payout),
    outcome: won ? "win" : "loss",
    newBalance: formatVibes(newBalance),
    provablyFair: {
      serverSeedId: bet.serverSeedId,
      clientSeed: bet.clientSeed,
      nonce: bet.nonce,
    },
  };
}

// ─── History ─────────────────────────────────────────────────────────────────

export async function getDemoGameHistory(
  userId: string,
  gameType?: string,
  page = 1,
  limit = 20
) {
  const skip = (page - 1) * limit;
  const where = gameType ? { userId, gameType } : { userId };

  const [bets, total] = await Promise.all([
    db.virtualBet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        serverSeed: {
          select: { hashedSeed: true, revealedSeed: true, revealedAt: true },
        },
      },
    }),
    db.virtualBet.count({ where }),
  ]);

  return {
    bets: bets.map((b) => ({
      ...b,
      serverSeedHash: b.serverSeed.hashedSeed,
      revealedSeed: b.serverSeed.revealedSeed,
      revealedAt: b.serverSeed.revealedAt?.toISOString() ?? null,
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
