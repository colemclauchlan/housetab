import { describe, it, expect, vi, type Mock } from "vitest";
import {
  buildLinkingMessage,
  handleLinkCallback,
  parseLinkData,
  type LinkDeps,
} from "@/lib/telegram/linking";
import type { TgCallbackQuery } from "@/lib/telegram/updates";

describe("parseLinkData", () => {
  it("extracts the member id", () => {
    expect(parseLinkData("link:abc-123")).toBe("abc-123");
  });
  it("rejects non-link data", () => {
    expect(parseLinkData("paid")).toBeNull();
    expect(parseLinkData(undefined)).toBeNull();
    expect(parseLinkData("link:")).toBeNull();
  });
});

describe("buildLinkingMessage", () => {
  it("makes one button per member, two per row", () => {
    const { reply_markup } = buildLinkingMessage([
      { id: "1", name: "Cole" },
      { id: "2", name: "Jake" },
      { id: "3", name: "Matt" },
    ]);
    expect(reply_markup.inline_keyboard).toHaveLength(2); // [Cole,Jake],[Matt]
    expect(reply_markup.inline_keyboard[0]).toEqual([
      { text: "Cole", callback_data: "link:1" },
      { text: "Jake", callback_data: "link:2" },
    ]);
    expect(reply_markup.inline_keyboard[1]).toEqual([{ text: "Matt", callback_data: "link:3" }]);
  });
});

function makeCbq(data: string, fromId = 500): TgCallbackQuery {
  return { id: "cbq1", from: { id: fromId }, data, message: { chat: { id: -100 } } };
}

function makeDeps(overrides: Partial<LinkDeps> = {}): LinkDeps & { answerCallback: Mock } {
  return {
    getMemberByTelegramId: vi.fn().mockResolvedValue(null),
    getMember: vi.fn().mockResolvedValue({ id: "m1", name: "Jake", telegram_user_id: null }),
    linkMember: vi.fn().mockResolvedValue(true),
    answerCallback: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as LinkDeps & { answerCallback: Mock };
}

describe("handleLinkCallback", () => {
  it("links a fresh member and toasts success", async () => {
    const deps = makeDeps();
    const res = await handleLinkCallback(makeCbq("link:m1"), deps);
    expect(res.outcome).toBe("linked");
    expect(deps.linkMember).toHaveBeenCalledWith("m1", 500);
    expect(deps.answerCallback).toHaveBeenCalledWith(
      "cbq1",
      expect.stringContaining("Linked you as Jake"),
    );
  });

  it("rejects an invalid button", async () => {
    const deps = makeDeps();
    const res = await handleLinkCallback(makeCbq("paid"), deps);
    expect(res.outcome).toBe("invalid");
    expect(deps.linkMember).not.toHaveBeenCalled();
  });

  it("tells an already-linked user their current name (re-tap on self)", async () => {
    const deps = makeDeps({
      getMemberByTelegramId: vi.fn().mockResolvedValue({ id: "m1", name: "Jake" }),
    });
    const res = await handleLinkCallback(makeCbq("link:m1"), deps);
    expect(res.outcome).toBe("already-linked");
    expect(deps.answerCallback).toHaveBeenCalledWith(
      "cbq1",
      expect.stringContaining("already linked as Jake"),
    );
    expect(deps.linkMember).not.toHaveBeenCalled();
  });

  it("blocks tapping a different name when already linked", async () => {
    const deps = makeDeps({
      getMemberByTelegramId: vi.fn().mockResolvedValue({ id: "m2", name: "Matt" }),
    });
    const res = await handleLinkCallback(makeCbq("link:m1"), deps);
    expect(res.outcome).toBe("already-linked");
    expect(deps.linkMember).not.toHaveBeenCalled();
  });

  it("rejects a claimed name", async () => {
    const deps = makeDeps({
      getMember: vi.fn().mockResolvedValue({ id: "m1", name: "Jake", telegram_user_id: 999 }),
    });
    const res = await handleLinkCallback(makeCbq("link:m1"), deps);
    expect(res.outcome).toBe("taken");
    expect(deps.answerCallback).toHaveBeenCalledWith(
      "cbq1",
      expect.stringContaining("already claimed"),
    );
    expect(deps.linkMember).not.toHaveBeenCalled();
  });

  it("handles a lost race (claimed between the check and the write)", async () => {
    const deps = makeDeps({ linkMember: vi.fn().mockResolvedValue(false) });
    const res = await handleLinkCallback(makeCbq("link:m1"), deps);
    expect(res.outcome).toBe("taken");
    expect(deps.answerCallback).toHaveBeenCalledWith(
      "cbq1",
      expect.stringContaining("just claimed"),
    );
  });

  it("handles a removed member", async () => {
    const deps = makeDeps({ getMember: vi.fn().mockResolvedValue(null) });
    const res = await handleLinkCallback(makeCbq("link:gone"), deps);
    expect(res.outcome).toBe("member-missing");
  });
});
