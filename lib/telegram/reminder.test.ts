import { describe, it, expect } from "vitest";
import { buildReminderMessage, escapeHtml, mentionHtml } from "@/lib/telegram/reminder";

describe("mentionHtml", () => {
  it("links a linked member by Telegram user id", () => {
    expect(mentionHtml({ name: "Jake", telegramUserId: 123, amountCents: 100 })).toBe(
      '<a href="tg://user?id=123">Jake</a>',
    );
  });
  it("leaves an unlinked member as plain (escaped) text", () => {
    expect(mentionHtml({ name: "A & B", telegramUserId: null, amountCents: 0 })).toBe("A &amp; B");
  });
});

describe("escapeHtml", () => {
  it("escapes &, <, >", () => {
    expect(escapeHtml('<a>&"')).toBe('&lt;a&gt;&amp;"');
  });
});

describe("buildReminderMessage", () => {
  it("mentions only the given (unpaid) members with their amounts", () => {
    const { text, parse_mode } = buildReminderMessage([
      { name: "Cole", telegramUserId: 111, amountCents: 14151 },
      { name: "Jake", telegramUserId: 222, amountCents: 14150 },
      { name: "Sam", telegramUserId: null, amountCents: 14150 },
    ]);
    expect(parse_mode).toBe("HTML");
    expect(text).toContain('<a href="tg://user?id=111">Cole</a> — $141.51');
    expect(text).toContain('<a href="tg://user?id=222">Jake</a> — $141.50');
    expect(text).toContain("Sam — $141.50"); // unlinked, no ping
    expect(text).toContain("Please send your e-transfer");
    expect(text).not.toContain("Matt"); // paid members aren't passed in
  });
});
