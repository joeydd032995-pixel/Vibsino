import { db } from "../lib/db";
import {
  generateServerSeed,
  hashServerSeed,
  generateClientSeed,
} from "../utils/hash";
import { addBalance, subtractBalance } from "./balanceService";
import { createNotification } from "./notificationService";
import { playCrash } from "../engines/crash";
import { spinRoulette, calculateRoulettePayout } from "../engines/roulette";
import { playCoinflip } from "../engines/coinflip";
import { placeMines, calculateMinesMultiplier } from "../engines/mines";
import { spinSlots } from "../engines/slots";
import { resolveJackpot } from "../engines/jackpot";
import { dealPokerHand, drawPokerCards } from "../engines/poker";
import type { RouletteBetItem } from "../engines/roulette";
import type { Card } from "../engines/poker";

const JACKPOT_THRESHOLD = 10;
const JACKPOT_HOUSE_EDGE = 0.05;

// Per-game bet limits (must match GAMES_METADATA in routes/games.ts)
const GAME_LIMITS: Record<string, { min: number; max: number }> = {
  crash:    { min: 0.1,  max: 1000 },
  roulette: { min: 0.1,  max: 500  },
  coinflip: { min: 0.1,  max: 1000 },
  mines:    { min: 0.1,  max: 500  },
  jackpot:  { min: 1,    max: 1000 },
  slots:    { min: 0.1,  max: 1000 },
  poker:    { min: 1,    max: 500  },
};

function getHouseEdge(gameType: string): number {
  const edges: Record<string, number> = {
    crash: 0.01,
    roulette: 0.027,
    coinflip: 0.01,
    mines: 0.01,
    slots: 0.03,
    jackpot: 0.05,
    poker: 0.02,
  };
  return edges[gameType] ?? 0.02;
}

async function createSession(
  gameType: string,
  clientSeed?: string,
  userId?: string,
  status = "active"
) {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const resolvedClientSeed = clientSeed ?? generateClientSeed();

  return db.gameSession.create({
    data: {
      gameType,
      status,
      serverSeed,
      serverSeedHash,
      clientSeed: resolvedClientSeed,
      nonce: 0,
      houseEdge: getHouseEdge(gameType),
      userId: userId ?? null,
    },
  });
}

async function completeSession(sessionId: string) {
  return db.gameSession.update({
    where: { id: sessionId },
    data: { status: "completed" },
  });
}

// ---- SINGLE-ROUND GAMES (coinflip, roulette, slots, crash) ----

export async function playSingleRound(
  userId: string,
  gameType: "coinflip" | "roulette" | "slots" | "crash",
  amount: number,
  betData: Record<string, unknown>
) {
  const limits = GAME_LIMITS[gameType] ?? { min: 0.1, max: 1000 };
  if (amount < limits.min) throw new Error(`Minimum bet for ${gameType} is $${limits.min}`);
  if (amount > limits.max) throw new Error(`Maximum bet for ${gameType} is $${limits.max}`);

  const { user } = await subtractBalance(userId, amount, "bet");
  const session = await createSession(gameType, betData.clientSeed as string | undefined, userId);
  const { serverSeed, clientSeed, nonce } = session;
  const cs = clientSeed ?? "";

  const bet = await db.bet.create({
    data: {
      userId,
      gameSessionId: session.id,
      amount,
      currency: "USDC",
      betData: JSON.stringify(betData),
      verifiable: true,
    },
  });

  let outcomeStr: string;
  let payout = 0;
  let multiplier = 0;
  let gameData: Record<string, unknown> = {};

  switch (gameType) {
    case "coinflip": {
      const choice = (betData.choice as "heads" | "tails") ?? "heads";
      const result = playCoinflip({ serverSeed, clientSeed: cs, nonce, choice });
      multiplier = result.multiplier;
      payout = result.win ? amount * multiplier : 0;
      outcomeStr = result.win ? "win" : "loss";
      gameData = { result: result.result, win: result.win, choice };
      break;
    }
    case "roulette": {
      const spin = spinRoulette(serverSeed, cs, nonce);
      const bets = (betData.bets as RouletteBetItem[]) ?? [];
      if (bets.length > 0) {
        const total = bets.reduce((s, b) => s + b.value, 0);
        if (Math.abs(total - amount) > 0.01) {
          throw new Error("Bet total does not match wagered amount");
        }
      }
      const totalBetAmount = bets.reduce((s, b) => s + b.value, 0) || amount;
      payout = calculateRoulettePayout(spin, bets);
      multiplier = totalBetAmount > 0 ? payout / totalBetAmount : 0;
      outcomeStr = payout > 0 ? "win" : "loss";
      gameData = { number: spin.number, color: spin.color, isOdd: spin.isOdd, isHigh: spin.isHigh };
      break;
    }
    case "slots": {
      const spin = spinSlots(serverSeed, cs, nonce);
      multiplier = spin.payoutMultiplier;
      payout = amount * multiplier;
      outcomeStr = payout > 0 ? "win" : "loss";
      gameData = { reels: spin.reels, payoutMultiplier: spin.payoutMultiplier };
      break;
    }
    case "crash": {
      const autoCashout = (betData.autoCashout as number) ?? 2.0;
      const result = playCrash({ serverSeed, clientSeed: cs, nonce });
      const cashedOut = autoCashout <= result.crashPoint;
      multiplier = cashedOut ? autoCashout : 0;
      payout = cashedOut ? amount * autoCashout : 0;
      outcomeStr = cashedOut ? "win" : "loss";
      gameData = { crashPoint: result.crashPoint, cashedOut, autoCashout };
      break;
    }
    default:
      outcomeStr = "loss";
  }

  if (payout > 0) {
    await addBalance(userId, payout, "win");
  }

  await db.bet.update({
    where: { id: bet.id },
    data: { outcome: outcomeStr, payout, multiplier },
  });

  await completeSession(session.id);

  if (payout > 0) {
    await createNotification(
      userId,
      "bet_result",
      `You won $${payout.toFixed(2)}!`,
      `${gameType.charAt(0).toUpperCase() + gameType.slice(1)}: ${multiplier}x multiplier`
    );
  }

  // user.balance is already decremented by subtractBalance; add payout when won
  const newBalance = payout > 0 ? user.balance + payout : user.balance;

  return {
    betId: bet.id,
    gameType,
    outcome: outcomeStr,
    payout,
    multiplier,
    newBalance,
    provablyFair: {
      serverSeed,
      serverSeedHash: session.serverSeedHash,
      clientSeed: cs,
      nonce,
    },
    gameData,
  };
}

// ---- MINES ----

export async function startMinesGame(
  userId: string,
  amount: number,
  mineCount: number,
  clientSeed?: string
) {
  const minesLimits = GAME_LIMITS.mines!;
  if (amount < minesLimits.min) throw new Error(`Minimum bet for mines is $${minesLimits.min}`);
  if (amount > minesLimits.max) throw new Error(`Maximum bet for mines is $${minesLimits.max}`);
  if (mineCount < 1 || mineCount > 24) throw new Error("Mine count must be 1-24");

  const { user } = await subtractBalance(userId, amount, "bet");
  const session = await createSession("mines", clientSeed, userId);
  const { serverSeed, clientSeed: cs, nonce } = session;

  const { minePositions, hash } = placeMines({
    serverSeed,
    clientSeed: cs ?? "",
    nonce,
    mineCount,
  });

  await db.gameSession.update({
    where: { id: session.id },
    data: { result: JSON.stringify({ minePositions, hash }) },
  });

  const bet = await db.bet.create({
    data: {
      userId,
      gameSessionId: session.id,
      amount,
      currency: "USDC",
      betData: JSON.stringify({
        mineCount,
        revealedSafe: [] as number[],
        currentMultiplier: 0,
        clientSeed: cs ?? undefined,
      }),
      verifiable: true,
    },
  });

  return {
    betId: bet.id,
    sessionId: session.id,
    serverSeedHash: session.serverSeedHash,
    mineCount,
    gridSize: 25,
    newBalance: user.balance, // user.balance already decremented by subtractBalance
  };
}

export async function revealMineTile(
  userId: string,
  betId: string,
  tileIndex: number
) {
  const bet = await db.bet.findFirst({
    where: { id: betId, userId },
    include: { gameSession: true },
  });

  if (!bet) throw new Error("Bet not found");
  if (bet.gameSession.status !== "active") throw new Error("Game is not active");
  if (bet.outcome !== null) throw new Error("Game already ended");

  const sessionData = JSON.parse(bet.gameSession.result ?? "{}") as {
    minePositions: number[];
  };
  const betState = JSON.parse(bet.betData ?? "{}") as {
    mineCount: number;
    revealedSafe: number[];
    currentMultiplier: number;
  };

  const { minePositions } = sessionData;
  const { mineCount, revealedSafe } = betState;

  if (revealedSafe.includes(tileIndex)) {
    throw new Error("Tile already revealed");
  }

  if (minePositions.includes(tileIndex)) {
    // Mine hit — player loses
    await db.bet.update({
      where: { id: betId },
      data: {
        outcome: "loss",
        payout: 0,
        multiplier: 0,
        betData: JSON.stringify({ ...betState, minePositions }),
      },
    });
    await completeSession(bet.gameSessionId);

    return {
      hit: true,
      tileIndex,
      minePositions,
      outcome: "loss",
      payout: 0,
    };
  }

  const newRevealed = [...revealedSafe, tileIndex];
  const newMultiplier = calculateMinesMultiplier(mineCount, newRevealed.length, 0.01);

  await db.bet.update({
    where: { id: betId },
    data: {
      betData: JSON.stringify({
        ...betState,
        revealedSafe: newRevealed,
        currentMultiplier: newMultiplier,
      }),
      multiplier: newMultiplier,
    },
  });

  return {
    hit: false,
    tileIndex,
    revealedSafe: newRevealed,
    currentMultiplier: newMultiplier,
    remainingSafe: 25 - mineCount - newRevealed.length,
  };
}

export async function cashoutMines(userId: string, betId: string) {
  const bet = await db.bet.findFirst({
    where: { id: betId, userId },
    include: { gameSession: true },
  });

  if (!bet) throw new Error("Bet not found");
  if (bet.gameSession.status !== "active") throw new Error("Game is not active");
  if (bet.outcome !== null) throw new Error("Game already ended");

  const betState = JSON.parse(bet.betData ?? "{}") as {
    mineCount: number;
    revealedSafe: number[];
    currentMultiplier: number;
  };

  if (betState.revealedSafe.length === 0) {
    throw new Error("Must reveal at least one tile before cashing out");
  }

  const sessionData = JSON.parse(bet.gameSession.result ?? "{}") as {
    minePositions: number[];
  };

  const payout = bet.amount * betState.currentMultiplier;
  const { user } = await addBalance(userId, payout, "win");

  await db.bet.update({
    where: { id: betId },
    data: {
      outcome: "win",
      payout,
      multiplier: betState.currentMultiplier,
      betData: JSON.stringify({
        ...betState,
        minePositions: sessionData.minePositions,
      }),
    },
  });

  await completeSession(bet.gameSessionId);

  await createNotification(
    userId,
    "bet_result",
    `Mines cashout: $${payout.toFixed(2)}!`,
    `${betState.currentMultiplier}x multiplier with ${betState.revealedSafe.length} safe tiles`
  );

  return {
    outcome: "win",
    payout,
    multiplier: betState.currentMultiplier,
    minePositions: sessionData.minePositions,
    newBalance: user.balance,
    provablyFair: {
      serverSeed: bet.gameSession.serverSeed,
      serverSeedHash: bet.gameSession.serverSeedHash,
      clientSeed: bet.gameSession.clientSeed,
      nonce: bet.gameSession.nonce,
    },
  };
}

export async function getActiveMinesGame(userId: string) {
  const activeBet = await db.bet.findFirst({
    where: {
      userId,
      outcome: null,
      gameSession: { gameType: "mines", status: "active" },
    },
    include: {
      gameSession: {
        select: { serverSeedHash: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!activeBet) return null;

  const betState = JSON.parse(activeBet.betData ?? "{}") as {
    mineCount: number;
    revealedSafe: number[];
    currentMultiplier: number;
  };

  return {
    betId: activeBet.id,
    amount: activeBet.amount,
    mineCount: betState.mineCount ?? 3,
    revealedSafe: betState.revealedSafe ?? [],
    currentMultiplier: betState.currentMultiplier ?? 0,
    serverSeedHash: activeBet.gameSession.serverSeedHash,
  };
}

// ---- POKER ----

export async function dealPokerHandForUser(
  userId: string,
  amount: number,
  clientSeed?: string
) {
  const pokerLimits = GAME_LIMITS.poker!;
  if (amount < pokerLimits.min) throw new Error(`Minimum bet for poker is $${pokerLimits.min}`);
  if (amount > pokerLimits.max) throw new Error(`Maximum bet for poker is $${pokerLimits.max}`);

  const { user } = await subtractBalance(userId, amount, "bet");
  const session = await createSession("poker", clientSeed, userId);
  const { serverSeed, clientSeed: cs, nonce } = session;

  const { deck, initialHand } = dealPokerHand(serverSeed, cs ?? "", nonce);

  await db.gameSession.update({
    where: { id: session.id },
    data: { result: JSON.stringify({ deck }) },
  });

  const bet = await db.bet.create({
    data: {
      userId,
      gameSessionId: session.id,
      amount,
      currency: "USDC",
      betData: JSON.stringify({ phase: "deal", hand: initialHand }),
      verifiable: true,
    },
  });

  return {
    betId: bet.id,
    serverSeedHash: session.serverSeedHash,
    initialHand,
    newBalance: user.balance, // user.balance already decremented by subtractBalance
  };
}

export async function drawPokerCardsForUser(
  userId: string,
  betId: string,
  heldIndices: number[]
) {
  const bet = await db.bet.findFirst({
    where: { id: betId, userId },
    include: { gameSession: true },
  });

  if (!bet) throw new Error("Bet not found");
  if (bet.gameSession.status !== "active") throw new Error("Game is not active");

  const betState = JSON.parse(bet.betData ?? "{}") as { phase: string };
  if (betState.phase !== "deal") throw new Error("Cards already drawn");

  const sessionData = JSON.parse(bet.gameSession.result ?? "{}") as {
    deck: Card[];
  };

  const { finalHand, handRank, payoutMultiplier } = drawPokerCards(
    sessionData.deck,
    heldIndices
  );

  const payout = payoutMultiplier > 0 ? bet.amount * payoutMultiplier : 0;
  let newBalance = 0;

  if (payout > 0) {
    const { user } = await addBalance(userId, payout, "win");
    newBalance = user.balance;
  } else {
    const user = await db.user.findUnique({ where: { id: userId }, select: { balance: true } });
    newBalance = user?.balance ?? 0;
  }

  await db.bet.update({
    where: { id: betId },
    data: {
      outcome: payout > 0 ? "win" : "loss",
      payout,
      multiplier: payoutMultiplier,
      betData: JSON.stringify({ phase: "draw", finalHand, handRank, heldIndices }),
    },
  });

  await completeSession(bet.gameSessionId);

  if (payout > 0) {
    await createNotification(
      userId,
      "bet_result",
      `Poker: ${handRank}!`,
      `Won $${payout.toFixed(2)} with ${handRank}`
    );
  }

  return {
    finalHand,
    handRank,
    payoutMultiplier,
    payout,
    outcome: payout > 0 ? "win" : "loss",
    newBalance,
    provablyFair: {
      serverSeed: bet.gameSession.serverSeed,
      serverSeedHash: bet.gameSession.serverSeedHash,
      clientSeed: bet.gameSession.clientSeed,
      nonce: bet.gameSession.nonce,
    },
  };
}

// ---- JACKPOT ----

export async function addJackpotEntry(userId: string, amount: number) {
  const jackpotLimits = GAME_LIMITS.jackpot!;
  if (amount < jackpotLimits.min) throw new Error(`Minimum bet for jackpot is $${jackpotLimits.min}`);
  if (amount > jackpotLimits.max) throw new Error(`Maximum bet for jackpot is $${jackpotLimits.max}`);

  const { user } = await subtractBalance(userId, amount, "bet");

  let session = await db.gameSession.findFirst({
    where: { gameType: "jackpot", status: "waiting" },
    orderBy: { createdAt: "asc" },
  });

  if (!session) {
    session = await createSession("jackpot", generateClientSeed(), undefined, "waiting");
  }

  const tickets = Math.max(1, Math.floor(amount));

  const bet = await db.bet.create({
    data: {
      userId,
      gameSessionId: session.id,
      amount,
      currency: "USDC",
      betData: JSON.stringify({ tickets }),
      verifiable: true,
    },
  });

  const betCount = await db.bet.count({ where: { gameSessionId: session.id } });

  let jackpotResult = null;
  if (betCount >= JACKPOT_THRESHOLD) {
    jackpotResult = await resolveJackpotSession(session.id);
  }

  const poolAgg = await db.bet.aggregate({
    where: { gameSessionId: session.id },
    _sum: { amount: true },
  });

  // Broadcast updated jackpot state to all watchers
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { io } = require("../socket/index") as { io: import("socket.io").Server | null };
    const state = await getCurrentJackpot();
    io?.to("jackpot").emit("jackpot:state", state);
    if (jackpotResult) {
      // Find winner username from session bets
      const winnerBet = await db.bet.findFirst({
        where: { gameSessionId: session.id, outcome: "win" },
        include: { user: { select: { username: true } } },
      });
      io?.to("jackpot").emit("jackpot:winner", {
        winnerId: jackpotResult.winnerId,
        winnerUsername: winnerBet?.user.username ?? "Unknown",
        payout: jackpotResult.winnerPrize, // use the already-calculated prize
      });
    }
  } catch (err) {
    console.warn("[gameService] Socket broadcast failed:", err);
  }

  return {
    betId: bet.id,
    tickets,
    poolTotal: poolAgg._sum.amount ?? 0,
    newBalance: user.balance, // user.balance already decremented by subtractBalance
    jackpotResult,
  };
}

export async function resolveJackpotSession(sessionId: string) {
  const session = await db.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      bets: {
        include: { user: { select: { id: true, username: true } } },
      },
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.status === "completed") throw new Error("Already resolved");

  const participants = session.bets.map((b) => ({
    userId: b.userId,
    tickets: (JSON.parse(b.betData ?? "{}") as { tickets?: number }).tickets ?? Math.max(1, Math.floor(b.amount)),
  }));

  const totalPool = session.bets.reduce((s, b) => s + b.amount, 0);
  const houseAmount = totalPool * JACKPOT_HOUSE_EDGE;
  const winnerPrize = totalPool - houseAmount;

  const jackpotResult = resolveJackpot({
    serverSeed: session.serverSeed,
    clientSeed: session.clientSeed ?? "",
    nonce: session.nonce,
    participants,
  });

  await addBalance(jackpotResult.winnerId, winnerPrize, "win");

  await db.bet.updateMany({
    where: { gameSessionId: sessionId },
    data: { outcome: "loss" },
  });

  const winnerBet = session.bets.find((b) => b.userId === jackpotResult.winnerId);
  if (winnerBet) {
    await db.bet.update({
      where: { id: winnerBet.id },
      data: {
        outcome: "win",
        payout: winnerPrize,
        multiplier: winnerBet.amount > 0 ? winnerPrize / winnerBet.amount : 0,
      },
    });
  }

  await db.gameSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      result: JSON.stringify(jackpotResult),
    },
  });

  await createNotification(
    jackpotResult.winnerId,
    "bet_result",
    "Jackpot Winner! 🎉",
    `You won $${winnerPrize.toFixed(2)} from the jackpot pool!`
  );

  return { ...jackpotResult, winnerPrize };
}

export async function getCurrentJackpot() {
  const session = await db.gameSession.findFirst({
    where: { gameType: "jackpot", status: "waiting" },
    include: {
      bets: {
        select: {
          userId: true,
          amount: true,
          betData: true,
          user: { select: { username: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!session) {
    return { pool: 0, participants: [], threshold: JACKPOT_THRESHOLD };
  }

  const pool = session.bets.reduce((s, b) => s + b.amount, 0);
  const participants = session.bets.map((b) => ({
    username: b.user.username,
    amount: b.amount,
    tickets: (JSON.parse(b.betData ?? "{}") as { tickets?: number }).tickets ?? Math.max(1, Math.floor(b.amount)),
  }));

  return {
    sessionId: session.id,
    pool,
    participants,
    threshold: JACKPOT_THRESHOLD,
    serverSeedHash: session.serverSeedHash,
  };
}

// ---- HISTORY ----

export async function getGameHistory(
  userId: string,
  gameType: string | null,
  page: number,
  limit: number
) {
  const where = {
    userId,
    ...(gameType
      ? { gameSession: { gameType } }
      : {}),
  };

  const [bets, total] = await Promise.all([
    db.bet.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        gameSession: {
          select: { gameType: true, serverSeedHash: true, status: true },
        },
      },
    }),
    db.bet.count({ where }),
  ]);

  return {
    bets: bets.map((b) => ({
      id: b.id,
      gameType: b.gameSession.gameType,
      amount: b.amount,
      currency: b.currency,
      outcome: b.outcome,
      payout: b.payout,
      multiplier: b.multiplier,
      verifiable: b.verifiable,
      serverSeedHash: b.gameSession.serverSeedHash,
      sessionStatus: b.gameSession.status,
      createdAt: b.createdAt.toISOString(),
    })),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
