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

export type UserPublic = z.infer<typeof UserPublicSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type WalletLoginInput = z.infer<typeof WalletLoginSchema>;
export type WalletNonceRequest = z.infer<typeof WalletNonceRequestSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type PlaceBetInput = z.infer<typeof PlaceBetSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
