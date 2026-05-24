import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { signToken, verifyToken } from "../utils/jwt";
import {
  generateNonce,
  verifyEthereumSignature,
  verifySolanaSignature,
} from "../utils/walletAuth";
import {
  RegisterSchema,
  LoginSchema,
  WalletLoginSchema,
  WalletNonceRequestSchema,
} from "../types";
import { rateLimit } from "../middleware/rateLimit";

const authRouter = new Hono();

// In-memory nonce store (in production use Redis)
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

function buildUserResponse(user: {
  id: string;
  username: string;
  email: string | null;
  walletAddress: string | null;
  walletChain: string | null;
  balance: number;
  role: string;
  createdAt: Date;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    walletAddress: user.walletAddress,
    walletChain: user.walletChain,
    balance: user.balance,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

// Register
authRouter.post(
  "/register",
  rateLimit(20, 60000),
  zValidator("json", RegisterSchema),
  async (c) => {
    const { username, email, password } = c.req.valid("json");

    const existing = await db.user.findFirst({
      where: {
        OR: [{ username }, ...(email ? [{ email }] : [])],
      },
    });

    if (existing) {
      return c.json(
        {
          error: {
            message: "Username or email already taken",
            code: "DUPLICATE_USER",
          },
        },
        409
      );
    }

    const passwordHash = password ? await bcrypt.hash(password, 12) : null;

    const user = await db.user.create({
      data: {
        username,
        email: email ?? null,
        passwordHash,
      },
    });

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return c.json({ data: { token, user: buildUserResponse(user) } }, 201);
  }
);

// Login
authRouter.post(
  "/login",
  rateLimit(20, 60000),
  zValidator("json", LoginSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");

    const user = await db.user.findUnique({ where: { username } });
    if (!user || !user.passwordHash) {
      return c.json(
        {
          error: {
            message: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          },
        },
        401
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return c.json(
        {
          error: {
            message: "Invalid credentials",
            code: "INVALID_CREDENTIALS",
          },
        },
        401
      );
    }

    if (!user.isActive) {
      return c.json(
        {
          error: { message: "Account suspended", code: "ACCOUNT_SUSPENDED" },
        },
        403
      );
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return c.json({ data: { token, user: buildUserResponse(user) } });
  }
);

// Wallet nonce request
authRouter.post(
  "/wallet-nonce",
  rateLimit(30, 60000),
  zValidator("json", WalletNonceRequestSchema),
  async (c) => {
    const { address } = c.req.valid("json");
    const nonce = generateNonce();
    nonceStore.set(address.toLowerCase(), {
      nonce,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return c.json({ data: { nonce } });
  }
);

// Wallet login / register
authRouter.post(
  "/wallet-login",
  rateLimit(20, 60000),
  zValidator("json", WalletLoginSchema),
  async (c) => {
    const { address, signature, message, chain } = c.req.valid("json");
    const stored = nonceStore.get(address.toLowerCase());

    if (!stored || stored.expiresAt < Date.now() || stored.nonce !== message) {
      return c.json(
        {
          error: {
            message: "Invalid or expired nonce",
            code: "INVALID_NONCE",
          },
        },
        401
      );
    }

    let valid = false;
    if (chain === "ethereum") {
      valid = await verifyEthereumSignature(message, signature, address);
    } else if (chain === "solana") {
      valid = await verifySolanaSignature(message, signature, address);
    }

    if (!valid) {
      return c.json(
        {
          error: {
            message: "Invalid signature",
            code: "INVALID_SIGNATURE",
          },
        },
        401
      );
    }

    nonceStore.delete(address.toLowerCase());

    let user = await db.user.findUnique({
      where: { walletAddress: address.toLowerCase() },
    });

    if (!user) {
      const prefix = chain === "ethereum" ? "eth" : "sol";
      const suffix = address.replace(/^0x/, "").slice(0, 6).toLowerCase();
      const username = `${prefix}_${suffix}`;
      user = await db.user.create({
        data: {
          username,
          walletAddress: address.toLowerCase(),
          walletChain: chain,
        },
      });
    }

    if (!user.isActive) {
      return c.json(
        {
          error: { message: "Account suspended", code: "ACCOUNT_SUSPENDED" },
        },
        403
      );
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    return c.json({ data: { token, user: buildUserResponse(user) } });
  }
);

// Get current user
authRouter.get("/me", async (c) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  try {
    const payload = await verifyToken(authHeader.slice(7));
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return c.json(
        { error: { message: "User not found", code: "NOT_FOUND" } },
        404
      );
    }

    return c.json({ data: buildUserResponse(user) });
  } catch {
    return c.json(
      { error: { message: "Invalid token", code: "INVALID_TOKEN" } },
      401
    );
  }
});

export { authRouter };
