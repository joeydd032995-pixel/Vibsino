import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { rateLimit } from "../middleware/rateLimit";
import { addBalance, subtractBalance } from "../services/balanceService";
import { createNotification } from "../services/notificationService";
import type { User } from "@prisma/client";

type Variables = {
  user: User;
  userId: string;
};

const balanceRouter = new Hono<{ Variables: Variables }>();

const DepositSchema = z.object({
  amount: z.number().min(1).max(10000),
  currency: z.string().default("USDC"),
  txHash: z.string().optional(),
});

const WithdrawSchema = z.object({
  amount: z.number().min(1).max(10000),
  walletAddress: z.string().min(10),
});

// Mock deposit (Phase 2 — real blockchain integration in Phase 5)
balanceRouter.post(
  "/deposit",
  authMiddleware,
  rateLimit(10, 60000),
  zValidator("json", DepositSchema),
  async (c) => {
    const user = c.get("user");
    const { amount, currency, txHash } = c.req.valid("json");
    const { user: updated } = await addBalance(user.id, amount, "deposit", txHash);
    await createNotification(
      user.id,
      "deposit",
      "Deposit Successful",
      `${amount} ${currency} has been added to your balance.`
    );
    return c.json({ data: { balance: updated.balance, amount, currency } });
  }
);

// Mock withdrawal
balanceRouter.post(
  "/withdraw",
  authMiddleware,
  rateLimit(5, 60000),
  zValidator("json", WithdrawSchema),
  async (c) => {
    const user = c.get("user");
    const { amount, walletAddress } = c.req.valid("json");
    try {
      const { user: updated } = await subtractBalance(
        user.id,
        amount,
        "withdrawal",
        undefined,
        { walletAddress }
      );
      await createNotification(
        user.id,
        "withdrawal",
        "Withdrawal Initiated",
        `${amount} USDC withdrawal to ${walletAddress.slice(0, 8)}... is being processed.`
      );
      return c.json({ data: { balance: updated.balance, amount, walletAddress } });
    } catch (err) {
      return c.json(
        { error: { message: (err as Error).message, code: "WITHDRAWAL_FAILED" } },
        400
      );
    }
  }
);

export { balanceRouter };
