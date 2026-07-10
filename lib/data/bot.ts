import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

const KEYS = [
  "bot_token",
  "webhook_secret",
  "group_chat_id",
  "pending_group_chat_id",
  "group_confirmed",
] as const;

async function readSettings(keys: readonly string[]): Promise<Map<string, Json>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", keys as string[]);
  return new Map((data ?? []).map((r) => [r.key, r.value]));
}

async function writeSetting(key: string, value: Json): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(`failed to write setting ${key}: ${error.message}`);
}

export interface BotConfig {
  /** The bot token from env (prod) or the settings row (single-tenant MVP), or null. */
  token: string | null;
  tokenSource: "env" | "settings" | null;
  webhookSecret: string | null;
  groupChatId: number | null;
  pendingGroupChatId: number | null;
  groupConfirmed: boolean;
}

export async function getBotConfig(): Promise<BotConfig> {
  const map = await readSettings(KEYS);
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
  const settingsToken =
    typeof map.get("bot_token") === "string" ? (map.get("bot_token") as string) : null;
  return {
    token: envToken ?? settingsToken,
    tokenSource: envToken ? "env" : settingsToken ? "settings" : null,
    webhookSecret:
      typeof map.get("webhook_secret") === "string" ? (map.get("webhook_secret") as string) : null,
    groupChatId:
      typeof map.get("group_chat_id") === "number" ? (map.get("group_chat_id") as number) : null,
    pendingGroupChatId:
      typeof map.get("pending_group_chat_id") === "number"
        ? (map.get("pending_group_chat_id") as number)
        : null,
    groupConfirmed: map.get("group_confirmed") === true,
  };
}

export async function setBotToken(token: string): Promise<void> {
  await writeSetting("bot_token", token);
}

/**
 * The webhook secret used for `setWebhook` — must match what the webhook route
 * validates. Prefers the `TELEGRAM_WEBHOOK_SECRET` env var (recommended for prod);
 * otherwise returns the stored settings value, generating + persisting one on
 * first use.
 */
export async function ensureWebhookSecret(): Promise<string> {
  const envSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (envSecret) return envSecret;

  const map = await readSettings(["webhook_secret"]);
  const existing = map.get("webhook_secret");
  if (typeof existing === "string" && existing.length > 0) return existing;
  const secret = generateWebhookSecret();
  await writeSetting("webhook_secret", secret);
  return secret;
}

export async function confirmGroupChat(chatId: number): Promise<void> {
  await writeSetting("group_chat_id", chatId);
  await writeSetting("group_confirmed", true);
  await writeSetting("pending_group_chat_id", null);
}

export async function clearGroupChat(): Promise<void> {
  await writeSetting("group_chat_id", null);
  await writeSetting("group_confirmed", false);
}

/** 32 random bytes as hex — valid Telegram `secret_token` ([A-Za-z0-9_-], ≤256). */
export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
