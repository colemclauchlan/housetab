/**
 * Thin native Telegram Bot API client (raw fetch). We use this instead of grammY:
 * for a webhook-only bot that calls ~6 methods, a native client is simpler, has no
 * `init()`-on-boot requirement (grammY fetches getMe first), and keeps the
 * serverless cold path light. All calls need the bot token (from @BotFather).
 */

const API_BASE = "https://api.telegram.org";

interface TgApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

async function call<T>(
  token: string,
  method: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(params ?? {}),
  });
  const data = (await res
    .json()
    .catch(() => ({ ok: false }) as TgApiResponse<T>)) as TgApiResponse<T>;
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? `HTTP ${res.status}`}`);
  }
  return data.result as T;
}

export interface BotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
}

export interface WebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  allowed_updates?: string[];
}

export interface SentMessage {
  message_id: number;
  chat: { id: number };
}

/** Updates HouseTab subscribes to (reactions need explicit opt-in). */
export const ALLOWED_UPDATES = [
  "message",
  "edited_message",
  "callback_query",
  "my_chat_member",
  "message_reaction",
] as const;

export function getMe(token: string): Promise<BotInfo> {
  return call<BotInfo>(token, "getMe");
}

export function getWebhookInfo(token: string): Promise<WebhookInfo> {
  return call<WebhookInfo>(token, "getWebhookInfo");
}

export function setWebhook(token: string, url: string, secretToken: string): Promise<boolean> {
  return call<boolean>(token, "setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ALLOWED_UPDATES,
    drop_pending_updates: false,
  });
}

export function deleteWebhook(token: string): Promise<boolean> {
  return call<boolean>(token, "deleteWebhook", { drop_pending_updates: false });
}

export interface SendMessageOptions {
  reply_markup?: unknown;
  parse_mode?: "HTML" | "MarkdownV2";
  disable_notification?: boolean;
}

export function sendMessage(
  token: string,
  chatId: number,
  text: string,
  options?: SendMessageOptions,
): Promise<SentMessage> {
  return call<SentMessage>(token, "sendMessage", { chat_id: chatId, text, ...options });
}

export function editMessageText(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  options?: SendMessageOptions,
): Promise<SentMessage | true> {
  return call<SentMessage | true>(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    ...options,
  });
}

export function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
  showAlert = false,
): Promise<boolean> {
  return call<boolean>(token, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}
