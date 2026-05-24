import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { verifyGameRound, generateNewSeedPair } from "../services/provablyFairService";
import { db } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import type { User } from "@prisma/client";

type Variables = {
  user: User;
  userId: string;
};

const provablyFairRouter = new Hono<{ Variables: Variables }>();

const VerifySchema = z.object({
  serverSeed: z.string().min(10),
  clientSeed: z.string().min(1),
  nonce: z.number().int().min(0),
  gameType: z.enum(["crash", "roulette", "coinflip", "mines", "slots", "jackpot", "poker"]),
});

// Verify a game round
provablyFairRouter.post(
  "/verify",
  rateLimit(60, 60000),
  zValidator("json", VerifySchema),
  async (c) => {
    const input = c.req.valid("json");
    const result = verifyGameRound(input);
    return c.json({ data: result });
  }
);

// Get current seed info (hashed server seed) for active user
provablyFairRouter.get("/seeds", authMiddleware, async (c) => {
  const user = c.get("user");
  // Get the most recent active game session or generate preview
  const activeSession = await db.gameSession.findFirst({
    where: { status: { in: ["waiting", "active"] } },
    orderBy: { createdAt: "desc" },
    select: {
      serverSeedHash: true,
      clientSeed: true,
      nonce: true,
      gameType: true,
    },
  });

  if (activeSession) {
    return c.json({
      data: {
        serverSeedHash: activeSession.serverSeedHash,
        clientSeed: activeSession.clientSeed,
        nonce: activeSession.nonce,
        gameType: activeSession.gameType,
      },
    });
  }

  const { serverSeedHash } = generateNewSeedPair();
  return c.json({
    data: { serverSeedHash, clientSeed: null, nonce: 0, gameType: null },
  });
});

// Lookup a completed bet for verification
provablyFairRouter.get("/bet/:id", rateLimit(30, 60000), async (c) => {
  const betId = c.req.param("id");
  const bet = await db.bet.findUnique({
    where: { id: betId },
    include: {
      gameSession: {
        select: {
          serverSeed: true,
          serverSeedHash: true,
          clientSeed: true,
          nonce: true,
          gameType: true,
          status: true,
        },
      },
    },
  });
  if (!bet)
    return c.json({ error: { message: "Bet not found", code: "NOT_FOUND" } }, 404);

  const session = bet.gameSession;
  // Only reveal server seed for completed rounds
  const serverSeedRevealed =
    session.status === "completed" ? session.serverSeed : null;

  return c.json({
    data: {
      betId: bet.id,
      gameType: session.gameType,
      serverSeed: serverSeedRevealed,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
      nonce: session.nonce,
      status: session.status,
    },
  });
});

export { provablyFairRouter };
