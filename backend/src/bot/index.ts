import { Bot } from "grammy";

if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.warn("TELEGRAM_BOT_TOKEN is not set. Bot will not function.");
}

export const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN || "DUMMY_TOKEN");

// Basic bot commands
bot.command("start", async (ctx) => {
  await ctx.reply("Welcome to Vibsino! 🎰\n\nClick the button below to launch the Mini App.", {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "Launch Mini App",
            web_app: { url: process.env.WEBAPP_URL || "https://vibecode.dev" },
          },
        ],
      ],
    },
  });
});

bot.command("help", async (ctx) => {
  await ctx.reply("Need help? Contact our support or visit our website.");
});

// Handle other messages
bot.on("message", async (ctx) => {
  await ctx.reply("I'm a bot! Launch the Mini App to play games.");
});
