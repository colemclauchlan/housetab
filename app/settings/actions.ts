"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearGroupChat,
  confirmGroupChat,
  ensureWebhookSecret,
  getBotConfig,
  setBotToken,
} from "@/lib/data/bot";
import { setWebhook } from "@/lib/telegram/api";

function back(message: string, ok = false): never {
  redirect(`/settings?${ok ? "ok" : "error"}=${encodeURIComponent(message)}`);
}

export async function saveBotToken(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) back("Paste a bot token.");
  if (!/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) {
    back("That doesn't look like a @BotFather token (expected 123456:ABC…).");
  }
  await setBotToken(token);
  revalidatePath("/settings");
  back("Bot token saved.", true);
}

export async function registerWebhook() {
  const cfg = await getBotConfig();
  if (!cfg.token) back("Save a bot token first.");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (!appUrl) back("NEXT_PUBLIC_APP_URL is not set — deploy first, then register.");
  if (appUrl.startsWith("http://")) {
    back("Telegram requires an HTTPS public URL — register from the deployed site, not localhost.");
  }

  const secret = await ensureWebhookSecret();
  try {
    await setWebhook(cfg.token, `${appUrl}/api/telegram/webhook`, secret);
  } catch (e) {
    back(e instanceof Error ? e.message : "setWebhook failed.");
  }
  revalidatePath("/settings");
  back("Webhook registered with Telegram.", true);
}

export async function confirmGroup() {
  const cfg = await getBotConfig();
  if (cfg.pendingGroupChatId == null) back("No pending group to confirm.");
  await confirmGroupChat(cfg.pendingGroupChatId);
  revalidatePath("/settings");
  revalidatePath("/");
  back("Group confirmed — the bot will only act in this chat.", true);
}

export async function clearGroup() {
  await clearGroupChat();
  revalidatePath("/settings");
  back("Group cleared.", true);
}
