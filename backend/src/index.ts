import "@vibecodeapp/proxy"; // DO NOT REMOVE OTHERWISE VIBECODE PROXY WILL NOT WORK
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { env } from "./config/env";
import { securityHeaders } from "./middleware/security";
import { rateLimit } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { userRouter } from "./routes/user";

const app = new Hono();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
];

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && allowed.some((re) => re.test(origin)) ? origin : null,
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
app.route("/api/user", userRouter);

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
