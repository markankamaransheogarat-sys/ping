import { Bot, InlineKeyboard } from "grammy";

const token = process.env.BOT_TOKEN;
const appUrl = process.env.MINIAPP_URL ?? "https://example.com";
if (!token) throw new Error("BOT_TOKEN is required");

const bot = new Bot(token);

bot.command("start", (ctx) => {
  const kb = new InlineKeyboard()
    .webApp("🎁 Send a Drop", `${appUrl}/drop`)
    .row()
    .webApp("🧾 Start a Split", `${appUrl}/split`);
  return ctx.reply("⚡ Ping: money that flies like messages.", { reply_markup: kb });
});

bot.start();
