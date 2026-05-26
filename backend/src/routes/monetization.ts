/**
 * monetization.ts — Tips and premium boost routes
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { TipSchema, PurchaseBoostSchema } from "../types";
import {
  transferVirtualBalance,
  parseVibes,
  formatVibes,
  subtractVirtualBalance,
} from "../services/virtualBalanceService";
import { db } from "../lib/db";
import type { User } from "@prisma/client";

type Variables = { user: User; userId: string };

const monetizationRouter = new Hono<{ Variables: Variables }>();

monetizationRouter.use("*", authMiddleware);

// ─── Tip (VIBES transfer) ─────────────────────────────────────────────────────

monetizationRouter.post(
  "/tip",
  rateLimit(10, 60000),
  zValidator("json", TipSchema),
  async (c) => {
    const fromUserId = c.get("userId") as string;
    const { recipientUsername, amount, message } = c.req.valid("json");

    const recipient = await db.user.findUnique({
      where: { username: recipientUsername },
    });

    if (!recipient) {
      return c.json({ error: { message: "Recipient not found" } }, 404);
    }

    if (!recipient.isActive) {
      return c.json({ error: { message: "Recipient account is inactive" } }, 400);
    }

    const amountBigInt = parseVibes(amount);
    if (amountBigInt <= 0n) {
      return c.json({ error: { message: "Tip amount must be positive" } }, 400);
    }

    try {
      const { fromBalance } = await transferVirtualBalance(
        fromUserId,
        recipient.id,
        amountBigInt
      );

      // Create notification for recipient
      await db.notification.create({
        data: {
          userId: recipient.id,
          type: "tip_received",
          title: "VIBES Received!",
          message: message
            ? `You received ${formatVibes(amountBigInt)} VIBES: "${message}"`
            : `You received ${formatVibes(amountBigInt)} VIBES`,
          metadata: JSON.stringify({ fromUserId, amount }),
        },
      });

      return c.json({
        data: {
          senderBalance: formatVibes(fromBalance),
          recipientUsername,
          amount,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tip failed";
      const status = msg.includes("Insufficient") ? 402 : 400;
      return c.json({ error: { message: msg } }, status);
    }
  }
);

// ─── Purchase Boost ───────────────────────────────────────────────────────────

monetizationRouter.post(
  "/purchase-boost",
  rateLimit(5, 60000),
  zValidator("json", PurchaseBoostSchema),
  async (c) => {
    const userId = c.get("userId") as string;
    const { boostType, durationDays } = c.req.valid("json");

    // VIP boost cost: 50,000 VIBES (50.000 VIBES with 3 decimal places)
    // Double Daily cost: 10,000 VIBES
    const BOOST_COSTS: Record<"vip" | "doubleDaily", bigint> = {
      vip: 50_000_000n,
      doubleDaily: 10_000_000n,
    };

    const cost = BOOST_COSTS[boostType];
    const days = durationDays ?? (boostType === "vip" ? 30 : 7);

    try {
      // Deduct from virtual balance
      const newBalance = await subtractVirtualBalance(userId, cost);

      // Apply boost
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      if (boostType === "vip") {
        await db.user.update({
          where: { id: userId },
          data: { premiumUntil: expiresAt },
        });
      } else if (boostType === "doubleDaily") {
        await db.user.update({
          where: { id: userId },
          data: { doubleDaily: true, premiumUntil: expiresAt },
        });
      }

      return c.json({
        data: {
          boostType,
          expiresAt: expiresAt.toISOString(),
          newBalance: formatVibes(newBalance),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Purchase failed";
      const status = msg.includes("Insufficient") ? 402 : 400;
      return c.json({ error: { message: msg } }, status);
    }
  }
);

// ─── Boost Status ─────────────────────────────────────────────────────────────

monetizationRouter.get("/boost-status", rateLimit(30, 60000), async (c) => {
  const userId = c.get("userId") as string;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { premiumUntil: true, doubleDaily: true },
  });

  const now = new Date();
  const isPremium = user?.premiumUntil ? user.premiumUntil > now : false;
  const isDoubleDaily = isPremium && (user?.doubleDaily ?? false);

  return c.json({
    data: {
      isPremium,
      premiumUntil: user?.premiumUntil?.toISOString() ?? null,
      doubleDaily: isDoubleDaily,
    },
  });
});

export { monetizationRouter };
