import { db } from "../lib/db";

export async function addBalance(
  userId: string,
  amount: number,
  type: string,
  txHash?: string,
  metadata?: object
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  const [user, transaction] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { balance: { increment: amount } },
    }),
    db.transaction.create({
      data: {
        userId,
        type,
        amount,
        currency: "USDC",
        status: "completed",
        txHash: txHash ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    }),
  ]);
  return { user, transaction };
}

export async function subtractBalance(
  userId: string,
  amount: number,
  type: string,
  txHash?: string,
  metadata?: object
) {
  if (amount <= 0) throw new Error("Amount must be positive");
  // Check sufficient balance first
  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  if (!existing || existing.balance < amount) {
    throw new Error("Insufficient balance");
  }
  const [user, transaction] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { balance: { decrement: amount } },
    }),
    db.transaction.create({
      data: {
        userId,
        type,
        amount: -amount,
        currency: "USDC",
        status: "completed",
        txHash: txHash ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    }),
  ]);
  return { user, transaction };
}

export async function getHouseBalance(): Promise<number> {
  // House balance = sum of all losses minus sum of all wins
  const result = await db.transaction.aggregate({
    _sum: { amount: true },
    where: { type: { in: ["bet", "win"] } },
  });
  return -(result._sum.amount ?? 0);
}
