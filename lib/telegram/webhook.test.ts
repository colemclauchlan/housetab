import { describe, it, expect, vi, type Mock } from "vitest";
import { handleWebhookRequest, ingestUpdate, type WebhookDeps } from "@/lib/telegram/webhook";
import type { TgUpdate } from "@/lib/telegram/updates";

const SECRET = "s3cret-token";

function makeDeps(overrides: Partial<WebhookDeps> = {}): WebhookDeps & { dispatch: Mock } {
  return {
    recordEvent: vi.fn().mockResolvedValue(true),
    getGroupChatId: vi.fn().mockResolvedValue(null),
    dispatch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as WebhookDeps & { dispatch: Mock };
}

function makeReq(body: unknown, secret?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== undefined) headers["x-telegram-bot-api-secret-token"] = secret;
  return new Request("https://app.example/api/telegram/webhook", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const messageUpdate = (chatId: number, updateId = 1): TgUpdate => ({
  update_id: updateId,
  message: { chat: { id: chatId }, text: "hi" },
});

describe("handleWebhookRequest — secret validation", () => {
  it("rejects a wrong secret with 401", async () => {
    const deps = makeDeps();
    const res = await handleWebhookRequest(makeReq(messageUpdate(1), "wrong"), deps, SECRET);
    expect(res.status).toBe(401);
    expect(deps.recordEvent).not.toHaveBeenCalled();
    expect(deps.dispatch).not.toHaveBeenCalled();
  });

  it("rejects a missing secret header with 401", async () => {
    const deps = makeDeps();
    const res = await handleWebhookRequest(makeReq(messageUpdate(1)), deps, SECRET);
    expect(res.status).toBe(401);
  });

  it("rejects when no secret is configured (fail closed)", async () => {
    const deps = makeDeps();
    const res = await handleWebhookRequest(makeReq(messageUpdate(1), ""), deps, undefined);
    expect(res.status).toBe(401);
  });
});

describe("handleWebhookRequest — body validation", () => {
  it("returns 400 on invalid JSON", async () => {
    const deps = makeDeps();
    const res = await handleWebhookRequest(makeReq("{not json", SECRET), deps, SECRET);
    expect(res.status).toBe(400);
    expect(deps.recordEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when update_id is missing", async () => {
    const deps = makeDeps();
    const res = await handleWebhookRequest(makeReq({ message: {} }, SECRET), deps, SECRET);
    expect(res.status).toBe(400);
  });
});

describe("handleWebhookRequest — ingestion", () => {
  it("processes a new in-group update and returns 200", async () => {
    const deps = makeDeps({ getGroupChatId: vi.fn().mockResolvedValue(-100) });
    const res = await handleWebhookRequest(makeReq(messageUpdate(-100), SECRET), deps, SECRET);
    expect(res.status).toBe(200);
    expect(deps.recordEvent).toHaveBeenCalledTimes(1);
    expect(deps.dispatch).toHaveBeenCalledTimes(1);
  });

  it("processes when no group is configured yet (group capture path)", async () => {
    const deps = makeDeps({ getGroupChatId: vi.fn().mockResolvedValue(null) });
    const res = await handleWebhookRequest(makeReq(messageUpdate(555), SECRET), deps, SECRET);
    expect(res.status).toBe(200);
    expect(deps.dispatch).toHaveBeenCalledTimes(1);
  });

  it("ignores a foreign chat but still returns 200 and logs it", async () => {
    const deps = makeDeps({ getGroupChatId: vi.fn().mockResolvedValue(-100) });
    const res = await handleWebhookRequest(makeReq(messageUpdate(999), SECRET), deps, SECRET);
    expect(res.status).toBe(200);
    expect(deps.recordEvent).toHaveBeenCalledTimes(1); // logged
    expect(deps.dispatch).not.toHaveBeenCalled(); // not processed
  });

  it("dedupes a duplicate update (no dispatch) and returns 200", async () => {
    const deps = makeDeps({ recordEvent: vi.fn().mockResolvedValue(false) });
    const res = await handleWebhookRequest(makeReq(messageUpdate(-100), SECRET), deps, SECRET);
    expect(res.status).toBe(200);
    expect(deps.dispatch).not.toHaveBeenCalled();
  });
});

describe("ingestUpdate", () => {
  it("returns 'duplicate' and does not dispatch when already seen", async () => {
    const deps = makeDeps({ recordEvent: vi.fn().mockResolvedValue(false) });
    expect(await ingestUpdate(messageUpdate(1), deps)).toBe("duplicate");
    expect(deps.dispatch).not.toHaveBeenCalled();
  });

  it("returns 'ignored-foreign-chat' for a chat other than the configured group", async () => {
    const deps = makeDeps({ getGroupChatId: vi.fn().mockResolvedValue(-100) });
    expect(await ingestUpdate(messageUpdate(999), deps)).toBe("ignored-foreign-chat");
    expect(deps.dispatch).not.toHaveBeenCalled();
  });

  it("returns 'processed' for the configured group", async () => {
    const deps = makeDeps({ getGroupChatId: vi.fn().mockResolvedValue(-100) });
    expect(await ingestUpdate(messageUpdate(-100), deps)).toBe("processed");
    expect(deps.dispatch).toHaveBeenCalledTimes(1);
  });

  it("returns 'processed' when no group is configured", async () => {
    const deps = makeDeps({ getGroupChatId: vi.fn().mockResolvedValue(null) });
    expect(await ingestUpdate(messageUpdate(1), deps)).toBe("processed");
  });
});
