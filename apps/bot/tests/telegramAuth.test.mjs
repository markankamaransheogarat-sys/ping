import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { validateTelegramInitData } from "../dist/telegramAuth.js";

test("validates authentic Telegram WebApp initData HMAC", () => {
  const botToken = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";
  const userJson = JSON.stringify({ id: 42, first_name: "Alice", username: "alice" });
  const pairs = [`auth_date=1700000000`, `user=${userJson}`].sort();
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = crypto.createHmac("sha256", secretKey).update(pairs.join("\n")).digest("hex");

  const initData = new URLSearchParams({
    auth_date: "1700000000",
    user: userJson,
    hash,
  }).toString();

  const res = validateTelegramInitData(initData, botToken);
  assert.equal(res.valid, true);
  assert.equal(res.user?.id, 42);
  assert.equal(res.user?.username, "alice");
});

test("rejects tampered initData or missing hash", () => {
  assert.equal(validateTelegramInitData("auth_date=1700000000", "tok").valid, false);
  assert.equal(validateTelegramInitData("auth_date=1700000000&hash=deadbeef", "tok").valid, false);
});
