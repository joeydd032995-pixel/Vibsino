import { z } from "zod";

// User schemas
export const UserPublicSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email().nullable(),
  walletAddress: z.string().nullable(),
  walletChain: z.string().nullable(),
  balance: z.number(),
  role: z.string(),
  createdAt: z.string(),
});

// Auth schemas
export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
});

export const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const WalletLoginSchema = z.object({
  address: z.string(),
  signature: z.string(),
  message: z.string(),
  chain: z.enum(["ethereum", "solana"]),
});

export const WalletNonceRequestSchema = z.object({
  address: z.string(),
  chain: z.enum(["ethereum", "solana"]),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserPublicSchema,
});

// Bet schemas
export const PlaceBetSchema = z.object({
  gameSessionId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default("USDC"),
  betData: z.record(z.string(), z.unknown()).optional(),
});

// Transaction schemas
export const TransactionSchema = z.object({
  id: z.string(),
  type: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

// Pagination schema
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  pages: z.number(),
});

// Balance
export const DepositSchema = z.object({
  amount: z.number().min(1).max(10000),
  currency: z.string().default("USDC"),
  txHash: z.string().optional(),
});

export const WithdrawSchema = z.object({
  amount: z.number().min(1).max(10000),
  walletAddress: z.string().min(10),
});

// Notifications
export const NotificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  read: z.boolean(),
  createdAt: z.string(),
});

// Provably fair
export const VerifyRoundSchema = z.object({
  serverSeed: z.string().min(10),
  clientSeed: z.string().min(1),
  nonce: z.number().int().min(0),
  gameType: z.enum(["crash", "roulette", "coinflip", "mines", "slots", "jackpot", "poker"]),
});

// Admin
export const UpdateUserAdminSchema = z.object({
  role: z.enum(["user", "admin", "vip"]).optional(),
  isActive: z.boolean().optional(),
  balance: z.number().min(0).optional(),
});

// Leaderboard
export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  userId: z.string(),
  username: z.string(),
  totalWon: z.number().optional(),
  totalWagered: z.number().optional(),
  totalBets: z.number().optional(),
});

export type UserPublic = z.infer<typeof UserPublicSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type WalletLoginInput = z.infer<typeof WalletLoginSchema>;
export type WalletNonceRequest = z.infer<typeof WalletNonceRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type PlaceBetInput = z.infer<typeof PlaceBetSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type DepositInput = z.infer<typeof DepositSchema>;
export type WithdrawInput = z.infer<typeof WithdrawSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type VerifyRoundInput = z.infer<typeof VerifyRoundSchema>;
export type UpdateUserAdmin = z.infer<typeof UpdateUserAdminSchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
