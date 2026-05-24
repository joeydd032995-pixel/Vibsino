import { Hono } from "hono";
import { db } from "../lib/db";
import { authMiddleware } from "../middleware/auth";
import type { User } from "@prisma/client";

type Variables = {
  user: User;
  userId: string;
};

const userRouter = new Hono<{ Variables: Variables }>();

// Get user profile
userRouter.get("/profile", authMiddleware, async (c) => {
  const user = c.get("user");
  return c.json({
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress,
      walletChain: user.walletChain,
      balance: user.balance,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// Get balance
userRouter.get("/balance", authMiddleware, async (c) => {
  const user = c.get("user");
  const fresh = await db.user.findUnique({
    where: { id: user.id },
    select: { balance: true },
  });
  return c.json({ data: { balance: fresh?.balance ?? 0 } });
});

// Get bet history
userRouter.get("/bets", authMiddleware, async (c) => {
  const user = c.get("user");
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const [bets, total] = await Promise.all([
    db.bet.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { gameSession: { select: { gameType: true } } },
    }),
    db.bet.count({ where: { userId: user.id } }),
  ]);

  return c.json({
    data: {
      bets: bets.map((b) => ({
        id: b.id,
        gameType: b.gameSession.gameType,
        amount: b.amount,
        currency: b.currency,
        outcome: b.outcome,
        payout: b.payout,
        multiplier: b.multiplier,
        createdAt: b.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

// Get transaction history
userRouter.get("/transactions", authMiddleware, async (c) => {
  const user = c.get("user");
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);

  const [txns, total] = await Promise.all([
    db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.transaction.count({ where: { userId: user.id } }),
  ]);

  return c.json({
    data: {
      transactions: txns.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export { userRouter };
