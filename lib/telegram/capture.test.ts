import { describe, it, expect } from "vitest";
import { groupChatToCapture } from "@/lib/telegram/capture";
import type { TgUpdate } from "@/lib/telegram/updates";

describe("groupChatToCapture", () => {
  it("captures when the bot is added to a group (my_chat_member)", () => {
    const u: TgUpdate = {
      update_id: 1,
      my_chat_member: { chat: { id: -100123, type: "supergroup" } },
    };
    expect(groupChatToCapture(u)).toBe(-100123);
  });

  it("captures on /start in a group", () => {
    const u: TgUpdate = {
      update_id: 2,
      message: { chat: { id: -55, type: "group" }, text: "/start" },
    };
    expect(groupChatToCapture(u)).toBe(-55);
  });

  it("captures on /start@botname in a group", () => {
    const u: TgUpdate = {
      update_id: 3,
      message: { chat: { id: -77, type: "supergroup" }, text: "/start@housetab_bot" },
    };
    expect(groupChatToCapture(u)).toBe(-77);
  });

  it("does NOT capture /start in a private chat", () => {
    const u: TgUpdate = {
      update_id: 4,
      message: { chat: { id: 999, type: "private" }, text: "/start" },
    };
    expect(groupChatToCapture(u)).toBeNull();
  });

  it("does NOT capture a normal group message", () => {
    const u: TgUpdate = {
      update_id: 5,
      message: { chat: { id: -55, type: "group" }, text: "hey what's the rent" },
    };
    expect(groupChatToCapture(u)).toBeNull();
  });

  it("does NOT capture a word starting with start but not the command", () => {
    const u: TgUpdate = {
      update_id: 6,
      message: { chat: { id: -55, type: "group" }, text: "starting now" },
    };
    expect(groupChatToCapture(u)).toBeNull();
  });

  it("returns null for unrelated updates", () => {
    expect(groupChatToCapture({ update_id: 7 })).toBeNull();
  });
});
