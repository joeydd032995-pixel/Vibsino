import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "../lib/db";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { getHouseBalance } from "../services/balanceService";
import { createNotification } from "../services/notificationService";
import type { User } from "@prisma/client";

type Variables = {
  user: User;
  userId: string;
};

const adminRouter = new Hono<{ Variables: Variables }>();

// All admin routes require auth + admin role
adminRouter.use("*", authMiddleware, adminMiddleware);

// Platform stats
adminRouter.get("/stats", async (c) => {
  const [totalUsers, totalBets, recentBets, houseBalance, activeGames] =
    await Promise.all([
      db.user.count(),
      db.bet.count(),
      db.bet.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { username: true } },
          gameSession: { select: { gameType: true } },
        },
      }),
      getHouseBalance(),
      db.gameSession.count({ where: { status: "active" } }),
    ]);

  const totalWagered = await db.bet.aggregate({ _sum: { amount: true } });
  const totalWinnings = await db.bet.aggregate({
    _sum: { payout: true },
    where: { outcome: "win" },
  });

  return c.json({
    data: {
      totalUsers,
      totalBets,
      activeGames,
      houseBalance,
      totalWagered: totalWagered._sum.amount ?? 0,
      totalWinnings: totalWinnings._sum.payout ?? 0,
      recentBets: recentBets.map((b) => ({
        id: b.id,
        username: b.user.username,
        gameType: b.gameSession.gameType,
        amount: b.amount,
        outcome: b.outcome,
        payout: b.payout,
        createdAt: b.createdAt.toISOString(),
      })),
    },
  });
});

// List users with search + pagination
adminRouter.get("/users", async (c) => {
  const page = Number(c.req.query("page") ?? 1);
  const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
  const search = c.req.query("search") ?? "";

  const where = search
    ? {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        walletAddress: true,
        balance: true,
        role: true,
        isActive: true,
        createdAt: true,
        _count: { select: { bets: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return c.json({
    data: {
      users: users.map((u) => ({
        ...u,
        totalBets: u._count.bets,
        createdAt: u.createdAt.toISOString(),
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

const UpdateUserSchema = z.object({
  role: z.enum(["user", "admin", "vip"]).optional(),
  isActive: z.boolean().optional(),
  balance: z.number().min(0).optional(),
});

// Update user (ban, role change, balance adjustment)
adminRouter.put("/:id", zValidator("json", UpdateUserSchema), async (c) => {
  const id = c.req.param("id");
  const updates = c.req.valid("json");

  const user = await db.user.findUnique({ where: { id } });
  if (!user)
    return c.json({ error: { message: "User not found", code: "NOT_FOUND" } }, 404);

  await db.user.update({ where: { id }, data: updates });

  if (updates.isActive === false) {
    await createNotification(
      id,
      "system",
      "Account Suspended",
      "Your account has been suspended by an administrator. Contact support to appeal."
    );
  }

  return c.json({ data: { success: true, userId: id } });
});

// Recent game sessions
adminRouter.get("/games", async (c) => {
  const sessions = await db.gameSession.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bets: true } } },
  });
  return c.json({
    data: sessions.map((s) => ({
      id: s.id,
      gameType: s.gameType,
      status: s.status,
      houseEdge: s.houseEdge,
      betCount: s._count.bets,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

export { adminRouter };
