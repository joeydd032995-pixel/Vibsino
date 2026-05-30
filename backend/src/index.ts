import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { serve } from "@hono/node-server";
import { Server as IOServer } from "socket.io";
import { env } from "./config/env";
import { securityHeaders } from "./middleware/security";
import { rateLimit } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { telegramAuthRouter } from "./routes/telegramAuth";
import { userRouter } from "./routes/user";
import { balanceRouter } from "./routes/balance";
import { notificationsRouter } from "./routes/notifications";
import { provablyFairRouter } from "./routes/provablyFair";
import { adminRouter } from "./routes/admin";
import { leaderboardRouter } from "./routes/leaderboard";
import { gamesRouter } from "./routes/games";
import { demoRouter } from "./routes/demo";
import { monetizationRouter } from "./routes/monetization";
import { verificationRouter } from "./routes/verification";
import { bot } from "./bot/index";
import { webhookCallback } from "grammy";
import { setupSocketServer } from "./socket/index";

const app = new Hono();

// CORS allowlist — used by both HTTP and Socket.IO
const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins.some((re) => re.test(origin));
}

// CORS middleware
app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && isAllowedOrigin(origin) ? origin : null,
    credentials: true,
  })
);

// Security headers
app.use("*", securityHeaders);

// Request logging
app.use("*", honoLogger());

// Global rate limit
app.use("*", rateLimit());

// Health check endpoint
app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "vibecode-casino",
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
);

// Routes
app.route("/api/auth", authRouter);
app.route("/api/auth/telegram", telegramAuthRouter);
app.route("/api/user", userRouter);
app.route("/api/balance", balanceRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/provably-fair", provablyFairRouter);
app.route("/api/admin", adminRouter);
app.route("/api/leaderboard", leaderboardRouter);
app.route("/api/games", gamesRouter);
app.route("/api/demo", demoRouter);
app.route("/api/monetization", monetizationRouter);
app.route("/api/verification", verificationRouter);

// Telegram Webhook
app.post("/api/webhook", webhookCallback(bot, "hono"));

const port = Number(process.env.PORT) || 3000;

// Use @hono/node-server to get an http.Server for Socket.IO attachment
const httpServer = serve({ fetch: app.fetch, port });

// Attach Socket.IO to the HTTP server
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const io = new IOServer(httpServer as any, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  },
  path: "/socket.io",
  transports: ["websocket", "polling"],
});

// Wire up all socket handlers + start crash round loop
setupSocketServer(io);

console.log(`🎰 Vibecode Casino API running on port ${port}`);
console.log(`🔌 Socket.IO ready at /socket.io`);
