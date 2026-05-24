import { Hono } from "hono";
import { db } from "../lib/db";
import { rateLimit } from "../middleware/rateLimit";

const leaderboardRouter = new Hono();

leaderboardRouter.get("/top-winners", rateLimit(30, 60000), async (c) => {
  const period = c.req.query("period") ?? "all";
  const limit = Math.min(Number(c.req.query("limit") ?? 10), 50);

  const dateFilter =
    period === "week"
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : period === "month"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : undefined;

  const where = dateFilter
    ? { outcome: "win", createdAt: { gte: dateFilter } }
    : { outcome: "win" };

  const winners = await db.bet.groupBy({
    by: ["userId"],
    where,
    _sum: { payout: true },
    orderBy: { _sum: { payout: "desc" } },
    take: limit,
  });

  const userIds = winners.map((w) => w.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true, walletAddress: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return c.json({
    data: winners.map((w, i) => ({
      rank: i + 1,
      userId: w.userId,
      username: userMap.get(w.userId)?.username ?? "Unknown",
      totalWon: w._sum.payout ?? 0,
    })),
  });
});

leaderboardRouter.get("/top-wagered", rateLimit(30, 60000), async (c) => {
  const period = c.req.query("period") ?? "all";
  const limit = Math.min(Number(c.req.query("limit") ?? 10), 50);

  const dateFilter =
    period === "week"
      ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      : period === "month"
      ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      : undefined;

  const where = dateFilter ? { createdAt: { gte: dateFilter } } : {};

  const wagerers = await db.bet.groupBy({
    by: ["userId"],
    where,
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });

  const userIds = wagerers.map((w) => w.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, username: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  return c.json({
    data: wagerers.map((w, i) => ({
      rank: i + 1,
      userId: w.userId,
      username: userMap.get(w.userId)?.username ?? "Unknown",
      totalWagered: w._sum.amount ?? 0,
      totalBets: w._count.id,
    })),
  });
});

export { leaderboardRouter };
