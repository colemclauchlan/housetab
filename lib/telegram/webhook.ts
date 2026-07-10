import { classifyUpdate, extractChatId, type TgUpdate } from "@/lib/telegram/updates";

/**
 * Dependencies the webhook needs, injected so the flow is unit-testable without a
 * database or network.
 */
export interface WebhookDeps {
  /**
   * Persist the update to the events log. Returns true if it was newly recorded,
   * false if this update_id was already seen (Telegram retry → dedupe).
   */
  recordEvent(update: TgUpdate): Promise<boolean>;
  /** The confirmed group chat id, or null if the group hasn't been set up yet. */
  getGroupChatId(): Promise<number | null>;
  /** Handle a fresh, in-group update (grammY handlers wire in from M2.3). */
  dispatch(update: TgUpdate): Promise<void>;
}

export type IngestDecision = "duplicate" | "ignored-foreign-chat" | "processed";

/**
 * Log + dedupe + chat-filter an update, dispatching it only when it is new and
 * from the configured group. When no group is configured yet, updates are allowed
 * through so the group-capture flow (M2.2) can run.
 */
export async function ingestUpdate(update: TgUpdate, deps: WebhookDeps): Promise<IngestDecision> {
  const isNew = await deps.recordEvent(update);
  if (!isNew) return "duplicate";

  const chatId = extractChatId(update);
  const groupChatId = await deps.getGroupChatId();
  if (groupChatId != null && chatId != null && chatId !== groupChatId) {
    return "ignored-foreign-chat";
  }

  await deps.dispatch(update);
  return "processed";
}

/**
 * Full webhook request handler: validates Telegram's secret-token header, parses
 * the update, and ingests it. Always answers 200 on a valid request (so Telegram
 * doesn't retry a successfully-received update); dedupe makes retries harmless.
 * Separated from the route so it can be tested with mocked deps + Requests.
 */
export async function handleWebhookRequest(
  req: Request,
  deps: WebhookDeps,
  expectedSecret: string | undefined,
): Promise<Response> {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!expectedSecret || secret !== expectedSecret) {
    return new Response("unauthorized", { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (typeof update?.update_id !== "number") {
    return new Response("bad request", { status: 400 });
  }

  await ingestUpdate(update, deps);
  return new Response("ok", { status: 200 });
}

/** Convenience re-export for callers building events rows. */
export { classifyUpdate };
