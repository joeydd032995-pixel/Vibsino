/**
 * demo.ts — F2P/Demo game routes
 * All routes require auth. Rate limits are stricter than real-money routes.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import {
  DemoPlaySchema,
  DemoMinesStartSchema,
  DemoMinesRevealSchema,
  DemoMinesCashoutSchema,
  DemoPokerDealSchema,
  DemoPokerDrawSchema,
  DemoGameTypeSchema,
} from "../types";
import {
  playDemoRound,
  startDemoMinesGame,
  revealDemoMineTile,
  cashoutDemoMines,
  getActiveDemoMinesGame,
  dealDemoPokerHand,
  drawDemoPokerCards,
  getDemoGameHistory,
} from "../services/demoGameService";
import {
  getOrCreateVirtualBalance,
  claimDailyVibes,
  canClaimDaily,
  formatVibes,
} from "../services/virtualBalanceService";
import { getOrCreateActiveSeed } from "../utils/provablyFair";

const demoRouter = new Hono();

// All demo routes require auth
demoRouter.use("*", authMiddleware);

// ─── Balance ─────────────────────────────────────────────────────────────────

demoRouter.get("/balance", rateLimit(60, 60000), async (c) => {
  const userId = c.get("userId") as string;
  const { amount, currency, lastDailyClaim } = await getOrCreateVirtualBalance(userId);
  const { canClaim, nextClaimAt } = await canClaimDaily(userId);

  return c.json({
    data: {
      amount: formatVibes(amount),
      currency,
      lastDailyClaim: lastDailyClaim?.toISOString() ?? null,
      canClaim,
      nextClaimAt: nextClaimAt?.toISOString() ?? null,
    },
  });
});

// ─── Daily Claim ─────────────────────────────────────────────────────────────

demoRouter.post("/daily-claim", rateLimit(5, 3600000), async (c) => {
  const userId = c.get("userId") as string;
  const user = c.get("user") as { premiumUntil?: Date | null; doubleDaily?: boolean } | undefined;

  const isDoubleDaily =
    user?.doubleDaily === true &&
    (user?.premiumUntil ? user.premiumUntil > new Date() : false);

  try {
    const { claimed, newBalance, nextClaimAt } = await claimDailyVibes(
      userId,
      isDoubleDaily
    );
    return c.json({
      data: {
        claimed: formatVibes(claimed),
        newBalance: formatVibes(newBalance),
        nextClaimAt: nextClaimAt.toISOString(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Claim failed";
    return c.json({ error: { message } }, 429);
  }
});

// ─── Play (single-round games) ────────────────────────────────────────────────

demoRouter.post(
  "/play/:gameType",
  rateLimit(20, 60000),
  zValidator("json", DemoPlaySchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { gameType } = c.req.param();

    // Validate gameType
    const parsed = DemoGameTypeSchema.safeParse(gameType);
    if (!parsed.success) {
      return c.json({ error: { message: `Invalid game type: ${gameType}` } }, 400);
    }

    const { amount, clientSeed, betData } = c.req.valid("json");

    try {
      const result = await playDemoRound(
        userId,
        parsed.data,
        amount,
        clientSeed,
        betData
      );
      return c.json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Game play failed";
      const status = message.includes("Insufficient") ? 402 : 400;
      return c.json({ error: { message } }, status);
    }
  }
);

// ─── Mines ───────────────────────────────────────────────────────────────────

demoRouter.post(
  "/mines/start",
  rateLimit(15, 60000),
  zValidator("json", DemoMinesStartSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { amount, mineCount, clientSeed } = c.req.valid("json");
    try {
      const result = await startDemoMinesGame(userId, amount, mineCount, clientSeed);
      return c.json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start mines";
      return c.json({ error: { message } }, 400);
    }
  }
);

demoRouter.post(
  "/mines/reveal",
  rateLimit(60, 60000),
  zValidator("json", DemoMinesRevealSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { betId, tileIndex } = c.req.valid("json");
    try {
      const result = await revealDemoMineTile(userId, betId, tileIndex);
      return c.json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reveal failed";
      return c.json({ error: { message } }, 400);
    }
  }
);

demoRouter.post(
  "/mines/cashout",
  rateLimit(15, 60000),
  zValidator("json", DemoMinesCashoutSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { betId } = c.req.valid("json");
    try {
      const result = await cashoutDemoMines(userId, betId);
      return c.json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Cashout failed";
      return c.json({ error: { message } }, 400);
    }
  }
);

demoRouter.get("/mines/active", rateLimit(30, 60000), async (c) => {
  const userId = c.get("userId") as string;
  const activeBet = await getActiveDemoMinesGame(userId);
  return c.json({ data: activeBet ?? null });
});

// ─── Poker ────────────────────────────────────────────────────────────────────

demoRouter.post(
  "/poker/deal",
  rateLimit(15, 60000),
  zValidator("json", DemoPokerDealSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { amount, clientSeed } = c.req.valid("json");
    try {
      const result = await dealDemoPokerHand(userId, amount, clientSeed);
      return c.json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Poker deal failed";
      return c.json({ error: { message } }, 400);
    }
  }
);

demoRouter.post(
  "/poker/draw",
  rateLimit(15, 60000),
  zValidator("json", DemoPokerDrawSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { betId, heldIndices } = c.req.valid("json");
    try {
      const result = await drawDemoPokerCards(userId, betId, heldIndices);
      return c.json({ data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Poker draw failed";
      return c.json({ error: { message } }, 400);
    }
  }
);

// ─── History ──────────────────────────────────────────────────────────────────

demoRouter.get("/history", rateLimit(30, 60000), async (c) => {
  const userId = c.get("userId") as string;
  const page = parseInt(c.req.query("page") ?? "1");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 50);
  const gameType = c.req.query("gameType");

  const result = await getDemoGameHistory(userId, gameType, page, limit);
  return c.json({ data: result });
});

// ─── Server Seed Info ─────────────────────────────────────────────────────────

demoRouter.get("/seed/current", rateLimit(30, 60000), async (c) => {
  const userId = c.get("userId") as string;
  const seed = await getOrCreateActiveSeed(userId);
  return c.json({
    data: {
      seedId: seed.seedId,
      hashedSeed: seed.hashedSeed,
      nonce: seed.nonce,
    },
  });
});

demoRouter.post("/seed/rotate", rateLimit(5, 60000), async (c) => {
  const userId = c.get("userId") as string;
  const { generateAndStoreServerSeed } = await import("../utils/provablyFair");
  const newSeed = await generateAndStoreServerSeed(userId);
  return c.json({
    data: {
      seedId: newSeed.seedId,
      hashedSeed: newSeed.hashedSeed,
      nonce: newSeed.nonce,
    },
  });
});

export { demoRouter };
