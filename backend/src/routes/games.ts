import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { db } from "../lib/db";
import {
  playSingleRound,
  startMinesGame,
  revealMineTile,
  cashoutMines,
  getActiveMinesGame,
  dealPokerHandForUser,
  drawPokerCardsForUser,
  addJackpotEntry,
  getCurrentJackpot,
  getGameHistory,
} from "../services/gameService";
import {
  CoinflipBetSchema,
  RouletteBetSchema,
  CrashBetSchema,
  MinesStartSchema,
  MinesRevealSchema,
  MinesCashoutSchema,
  PokerDrawSchema,
} from "../types";
import type { User } from "@prisma/client";

type Variables = { user: User; userId: string };

const gamesRouter = new Hono<{ Variables: Variables }>();

const VALID_GAME_TYPES = ["crash","roulette","coinflip","mines","slots","jackpot","poker"] as const;

const GAMES_METADATA = [
  { id: "crash",    name: "Crash",        houseEdge: 0.01,  minBet: 0.1, maxBet: 1000, description: "Multiplier rises until it crashes. Cash out before it does!" },
  { id: "roulette", name: "Roulette",     houseEdge: 0.027, minBet: 0.1, maxBet: 500,  description: "European roulette with 37 slots. Bet on numbers, colors, and more." },
  { id: "coinflip", name: "Coinflip",     houseEdge: 0.01,  minBet: 0.1, maxBet: 1000, description: "Simple heads or tails. 1.98x payout on a win." },
  { id: "mines",    name: "Mines",        houseEdge: 0.01,  minBet: 0.1, maxBet: 500,  description: "Reveal tiles without hitting mines. Cash out at any time." },
  { id: "jackpot",  name: "Jackpot",      houseEdge: 0.05,  minBet: 1,   maxBet: 1000, description: "Community pool. Bigger bets = more tickets = better odds." },
  { id: "slots",    name: "Slots",        houseEdge: 0.03,  minBet: 0.1, maxBet: 1000, description: "3-reel slot machine with classic symbols. Up to 100x on triple 7s." },
  { id: "poker",    name: "Video Poker",  houseEdge: 0.02,  minBet: 1,   maxBet: 500,  description: "Jacks or Better video poker. Classic 9/6 paytable." },
];

// ---- GET /api/games ----
gamesRouter.get("/", (c) => c.json({ data: { games: GAMES_METADATA } }));

// ---- GET /api/games/history ----
gamesRouter.get(
  "/history",
  authMiddleware,
  rateLimit(30, 60000),
  async (c) => {
    const user = c.get("user");
    const page = Math.max(1, Number(c.req.query("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 20)));
    const result = await getGameHistory(user.id, null, page, limit);
    return c.json({ data: result });
  }
);

// ---- GET /api/games/:gameType/history ----
gamesRouter.get(
  "/:gameType/history",
  authMiddleware,
  rateLimit(30, 60000),
  async (c) => {
    const user = c.get("user");
    const gameType = c.req.param("gameType");
    if (!VALID_GAME_TYPES.includes(gameType as (typeof VALID_GAME_TYPES)[number])) {
      return c.json({ error: { message: "Invalid game type", code: "BAD_REQUEST" } }, 400);
    }
    const page = Math.max(1, Number(c.req.query("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") ?? 20)));
    const result = await getGameHistory(user.id, gameType ?? null, page, limit);
    return c.json({ data: result });
  }
);

// ---- POST /api/games/coinflip/play ----
gamesRouter.post(
  "/coinflip/play",
  authMiddleware,
  rateLimit(30, 60000),
  zValidator("json", z.object({ amount: z.number().positive(), betData: CoinflipBetSchema })),
  async (c) => {
    const user = c.get("user");
    const { amount, betData } = c.req.valid("json");
    try {
      const result = await playSingleRound(user.id, "coinflip", amount, betData as Record<string, unknown>);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/roulette/play ----
gamesRouter.post(
  "/roulette/play",
  authMiddleware,
  rateLimit(30, 60000),
  zValidator("json", z.object({ amount: z.number().positive(), betData: RouletteBetSchema })),
  async (c) => {
    const user = c.get("user");
    const { amount, betData } = c.req.valid("json");
    try {
      const result = await playSingleRound(user.id, "roulette", amount, betData as Record<string, unknown>);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/slots/play ----
gamesRouter.post(
  "/slots/play",
  authMiddleware,
  rateLimit(30, 60000),
  zValidator("json", z.object({ amount: z.number().positive() })),
  async (c) => {
    const user = c.get("user");
    const { amount } = c.req.valid("json");
    try {
      const result = await playSingleRound(user.id, "slots", amount, {});
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/crash/play ----
gamesRouter.post(
  "/crash/play",
  authMiddleware,
  rateLimit(30, 60000),
  zValidator("json", z.object({ amount: z.number().positive(), betData: CrashBetSchema })),
  async (c) => {
    const user = c.get("user");
    const { amount, betData } = c.req.valid("json");
    try {
      const result = await playSingleRound(user.id, "crash", amount, betData as Record<string, unknown>);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/mines/start ----
gamesRouter.post(
  "/mines/start",
  authMiddleware,
  rateLimit(20, 60000),
  zValidator("json", z.object({ amount: z.number().positive(), betData: MinesStartSchema })),
  async (c) => {
    const user = c.get("user");
    const { amount, betData } = c.req.valid("json");
    try {
      const result = await startMinesGame(user.id, amount, betData.mineCount, betData.clientSeed);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/mines/reveal ----
gamesRouter.post(
  "/mines/reveal",
  authMiddleware,
  rateLimit(60, 60000),
  zValidator("json", MinesRevealSchema),
  async (c) => {
    const user = c.get("user");
    const { betId, tileIndex } = c.req.valid("json");
    try {
      const result = await revealMineTile(user.id, betId, tileIndex);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/mines/cashout ----
gamesRouter.post(
  "/mines/cashout",
  authMiddleware,
  rateLimit(20, 60000),
  zValidator("json", MinesCashoutSchema),
  async (c) => {
    const user = c.get("user");
    const { betId } = c.req.valid("json");
    try {
      const result = await cashoutMines(user.id, betId);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- GET /api/games/mines/active ----
gamesRouter.get(
  "/mines/active",
  authMiddleware,
  rateLimit(30, 60000),
  async (c) => {
    const user = c.get("user");
    const result = await getActiveMinesGame(user.id);
    return c.json({ data: { activeBet: result } });
  }
);

// ---- POST /api/games/poker/deal ----
gamesRouter.post(
  "/poker/deal",
  authMiddleware,
  rateLimit(20, 60000),
  zValidator(
    "json",
    z.object({
      amount: z.number().positive(),
      betData: z.object({ clientSeed: z.string().optional() }).optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const { amount, betData } = c.req.valid("json");
    try {
      const result = await dealPokerHandForUser(user.id, amount, betData?.clientSeed);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/poker/draw ----
gamesRouter.post(
  "/poker/draw",
  authMiddleware,
  rateLimit(20, 60000),
  zValidator("json", PokerDrawSchema),
  async (c) => {
    const user = c.get("user");
    const { betId, heldIndices } = c.req.valid("json");
    try {
      const result = await drawPokerCardsForUser(user.id, betId, heldIndices);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- POST /api/games/jackpot/bet ----
gamesRouter.post(
  "/jackpot/bet",
  authMiddleware,
  rateLimit(20, 60000),
  zValidator("json", z.object({ amount: z.number().positive() })),
  async (c) => {
    const user = c.get("user");
    const { amount } = c.req.valid("json");
    try {
      const result = await addJackpotEntry(user.id, amount);
      return c.json({ data: result });
    } catch (err) {
      return c.json({ error: { message: (err as Error).message, code: "GAME_ERROR" } }, 400);
    }
  }
);

// ---- GET /api/games/jackpot/current ----
gamesRouter.get(
  "/jackpot/current",
  rateLimit(60, 60000),
  async (c) => {
    const result = await getCurrentJackpot();
    return c.json({ data: result });
  }
);

// ---- GET /api/games/bet/:betId — public, hides serverSeed for active games ----
gamesRouter.get(
  "/bet/:betId",
  rateLimit(30, 60000),
  async (c) => {
    const betId = c.req.param("betId");
    const bet = await db.bet.findUnique({
      where: { id: betId },
      include: {
        gameSession: {
          select: {
            gameType: true,
            serverSeed: true,
            serverSeedHash: true,
            clientSeed: true,
            nonce: true,
            status: true,
            result: true,
          },
        },
      },
    });

    if (!bet) {
      return c.json({ error: { message: "Bet not found", code: "NOT_FOUND" } }, 404);
    }

    const session = bet.gameSession;
    const isCompleted = session.status === "completed";

    return c.json({
      data: {
        betId: bet.id,
        gameType: session.gameType,
        amount: bet.amount,
        outcome: bet.outcome,
        payout: bet.payout,
        multiplier: bet.multiplier,
        serverSeed: isCompleted ? session.serverSeed : null,
        serverSeedHash: session.serverSeedHash,
        clientSeed: session.clientSeed,
        nonce: session.nonce,
        status: session.status,
      },
    });
  }
);

export { gamesRouter };
