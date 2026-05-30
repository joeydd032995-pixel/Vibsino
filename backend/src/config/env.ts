import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  MIN_BET: z.coerce.number().default(0.01),
  MAX_BET: z.coerce.number().default(1000),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  WEBAPP_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);
