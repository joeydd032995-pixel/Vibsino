import { Context, Next } from "hono";
import { createHmac } from "crypto";

export async function telegramAuth(c: Context, next: Next) {
  const initData = c.req.header("X-Telegram-Init-Data");
  
  if (!initData) {
    return c.json({ error: "Missing Telegram init data" }, 401);
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return c.json({ error: "Server configuration error" }, 500);
  }

  try {
    const isValid = validateTelegramInitData(initData, botToken);
    if (!isValid) {
      return c.json({ error: "Invalid Telegram init data" }, 401);
    }
    
    // Parse user data and attach to context
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user") || "{}");
    c.set("tgUser", user);
    
    await next();
  } catch (error) {
    return c.json({ error: "Failed to validate Telegram data" }, 401);
  }
}

function validateTelegramInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hmac = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return hmac === hash;
}
