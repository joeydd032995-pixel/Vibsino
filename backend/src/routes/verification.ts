/**
 * verification.ts — Public provably fair verification endpoints
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { DemoVerifySchema } from "../types";
import { verifyProvablyFair, revealServerSeed } from "../utils/provablyFair";
import type { F2PGameType } from "../utils/provablyFair";
import { db } from "../lib/db";
import type { User } from "@prisma/client";

type Variables = { user: User; userId: string };

const verificationRouter = new Hono<{ Variables: Variables }>();

// ─── Public: verify by providing raw seed ─────────────────────────────────────

verificationRouter.post(
  "/verify",
  rateLimit(60, 60000),
  zValidator("json", DemoVerifySchema),
  async (c) => {
    const { rawServerSeed, hashedSeed, clientSeed, nonce, gameType, mineCount } =
      c.req.valid("json");

    const result = verifyProvablyFair(
      rawServerSeed,
      hashedSeed,
      clientSeed,
      nonce,
      gameType as F2PGameType,
      mineCount ? { mineCount } : undefined
    );

    return c.json({
      data: {
        seedMatch: result.seedMatch,
        hash: result.result.hash,
        float: result.result.float,
        outcome: result.result.outcome,
        gameType,
      },
    });
  }
);

// ─── Public: get seed reveal status by seedId ─────────────────────────────────

verificationRouter.get("/seed/:seedId", rateLimit(60, 60000), async (c) => {
  const { seedId } = c.req.param();

  const seed = await db.serverSeed.findUnique({
    where: { id: seedId },
    select: {
      id: true,
      hashedSeed: true,
      revealedSeed: true,
      revealedAt: true,
      nonce: true,
    },
  });

  if (!seed) {
    return c.json({ error: { message: "Seed not found" } }, 404);
  }

  return c.json({
    data: {
      seedId: seed.id,
      hashedSeed: seed.hashedSeed,
      nonce: seed.nonce,
      revealedSeed: seed.revealedSeed ?? null,
      revealedAt: seed.revealedAt?.toISOString() ?? null,
    },
  });
});

// ─── Authenticated: reveal seed for a specific virtual bet ───────────────────

verificationRouter.get(
  "/reveal/:betId",
  rateLimit(30, 60000),
  authMiddleware,
  async (c) => {
    const userId = c.get("userId") as string;
    const { betId } = c.req.param();

    const bet = await db.virtualBet.findFirst({
      where: { id: betId, userId },
      include: {
        serverSeed: {
          select: {
            id: true,
            hashedSeed: true,
            revealedSeed: true,
            revealedAt: true,
            nonce: true,
          },
        },
      },
    });

    if (!bet) {
      return c.json({ error: { message: "Bet not found" } }, 404);
    }

    const seed = bet.serverSeed;

    // If bet is complete but seed not yet revealed, trigger reveal
    if (bet.outcome !== null && !seed.revealedSeed) {
      revealServerSeed(seed.id, 3000);
    }

    return c.json({
      data: {
        betId,
        serverSeedId: seed.id,
        hashedSeed: seed.hashedSeed,
        nonce: seed.nonce,
        clientSeed: bet.clientSeed,
        rawSeed: seed.revealedSeed ?? null,
        revealedAt: seed.revealedAt?.toISOString() ?? null,
        gameType: bet.gameType,
      },
    });
  }
);

export { verificationRouter };
