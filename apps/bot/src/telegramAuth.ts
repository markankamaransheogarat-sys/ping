import crypto from "crypto";

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

/**
 * Validates Telegram Mini App initData string according to Telegram specification.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string, botToken: string): { valid: boolean; user?: TelegramUser } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) {
      return { valid: false };
    }

    // Sort all key=value pairs alphabetically except hash
    const pairs: string[] = [];
    params.forEach((val, key) => {
      if (key !== "hash") {
        pairs.push(`${key}=${val}`);
      }
    });
    pairs.sort();
    const dataCheckString = pairs.join("\n");

    // Secret key = HMAC-SHA256("WebAppData", botToken)
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();

    // Calculated hash = HMAC-SHA256(secretKey, dataCheckString)
    const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (calculatedHash !== hash) {
      return { valid: false };
    }

    const userRaw = params.get("user");
    const user: TelegramUser | undefined = userRaw ? JSON.parse(userRaw) : undefined;

    return { valid: true, user };
  } catch (err) {
    console.error("Failed to validate initData:", err);
    return { valid: false };
  }
}
