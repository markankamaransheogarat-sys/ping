import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { Bot, InlineKeyboard } from "grammy";
import { validateTelegramInitData } from "./telegramAuth.js";
import {
  ensureFundedTestnetAccount,
  getClaimableBalance,
  TESTNET_HORIZON_URL,
} from "./stellar.js";

const token = process.env.BOT_TOKEN || "test_token_placeholder";
const appUrl = process.env.MINIAPP_URL || "https://ping-miniapp.local";
const port = process.env.PORT || 3000;

// Initialize grammY Bot
export const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const text = ctx.message?.text || "";
  const parts = text.split(" ");
  const payload = parts.length > 1 ? parts[1] : null;

  if (payload) {
    if (payload.startsWith("drop_")) {
      const dropId = payload.replace("drop_", "");
      const kb = new InlineKeyboard().webApp(
        "🎁 Open & Claim Drop",
        `${appUrl}?drop=${dropId}`
      );
      return ctx.reply(
        `🎉 You received a **Ping Drop**!\n\nTap the button below to claim it straight to your wallet.`,
        { reply_markup: kb, parse_mode: "Markdown" }
      );
    }

    if (payload.startsWith("split_")) {
      const splitId = payload.replace("split_", "");
      const kb = new InlineKeyboard().webApp(
        "🧾 View & Chip In",
        `${appUrl}?split=${splitId}`
      );
      return ctx.reply(
        `🧾 You are invited to join a **Ping Split**!\n\nTap below to check the goal and chip in your share.`,
        { reply_markup: kb, parse_mode: "Markdown" }
      );
    }
  }

  const kb = new InlineKeyboard()
    .webApp("⚡ Open Ping App", `${appUrl}`)
    .row()
    .webApp("🎁 Send a Drop", `${appUrl}?view=drop`)
    .webApp("🧾 Start a Split", `${appUrl}?view=split`);

  return ctx.reply(
    "⚡ **Ping**: Money that flies like messages.\n\nSend money as easy as text. Split group expenses with trustless escrow on Stellar.",
    { reply_markup: kb, parse_mode: "Markdown" }
  );
});

bot.command("drop", async (ctx) => {
  const kb = new InlineKeyboard().webApp("🎁 Send a Drop", `${appUrl}?view=drop`);
  return ctx.reply("Create a Ping Drop link and send funds to anyone instantly:", {
    reply_markup: kb,
  });
});

bot.command("split", async (ctx) => {
  const kb = new InlineKeyboard().webApp("🧾 Start a Split", `${appUrl}?view=split`);
  return ctx.reply("Pool money with friends with automated smart-contract escrow refunds:", {
    reply_markup: kb,
  });
});

// Express Server for Mini App Backend
export const app = express();
app.use(cors());
app.use(express.json());

// Auth verification endpoint
app.post("/api/auth/verify", (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ error: "Missing initData" });
  }

  // If token is placeholder or in local dev mode, allow validation
  if (token === "test_token_placeholder") {
    return res.json({ valid: true, mock: true, user: { id: 12345, first_name: "TestUser" } });
  }

  const result = validateTelegramInitData(initData, token);
  return res.json(result);
});

// Testnet faucet helper
app.post("/api/faucet", async (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: "Missing publicKey" });
  }
  try {
    const funded = await ensureFundedTestnetAccount(publicKey);
    return res.json({ success: funded });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Failed to fund account" });
  }
});

// Claimable balance query
app.get("/api/balance/:id", async (req, res) => {
  try {
    const balance = await getClaimableBalance(req.params.id);
    return res.json({ balance });
  } catch (err: any) {
    return res.status(404).json({ error: "Balance not found or already claimed" });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", app: "Ping Bot & API", testnet: TESTNET_HORIZON_URL });
});

// Start bot and server if not testing
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`[Ping] API Server listening on port ${port}`);
  });

  if (process.env.BOT_TOKEN && process.env.BOT_TOKEN !== "test_token_placeholder") {
    bot.start();
    console.log("[Ping] Telegram bot started successfully");
  } else {
    console.log("[Ping] Telegram bot skipped (BOT_TOKEN not provided or placeholder)");
  }
}

