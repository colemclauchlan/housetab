import { describe, it, expect } from "vitest";
import { classifyUpdate, extractChatId, type TgUpdate } from "@/lib/telegram/updates";

describe("extractChatId", () => {
  it("reads chat id from a message", () => {
    expect(extractChatId({ update_id: 1, message: { chat: { id: 42 } } })).toBe(42);
  });
  it("reads chat id from a callback_query's message", () => {
    expect(
      extractChatId({
        update_id: 2,
        callback_query: { id: "c", from: { id: 9 }, message: { chat: { id: 77 } } },
      }),
    ).toBe(77);
  });
  it("reads chat id from my_chat_member (group add)", () => {
    expect(extractChatId({ update_id: 3, my_chat_member: { chat: { id: -100 } } })).toBe(-100);
  });
  it("reads chat id from a message_reaction", () => {
    expect(extractChatId({ update_id: 4, message_reaction: { chat: { id: 5 } } })).toBe(5);
  });
  it("returns null when no chat is present", () => {
    expect(extractChatId({ update_id: 5 })).toBeNull();
  });
});

describe("classifyUpdate", () => {
  const cases: [TgUpdate, string][] = [
    [{ update_id: 1, callback_query: { id: "c", from: { id: 1 } } }, "callback_query"],
    [{ update_id: 2, message: { text: "hi" } }, "message"],
    [{ update_id: 3, my_chat_member: {} }, "my_chat_member"],
    [{ update_id: 4, message_reaction: {} }, "message_reaction"],
    [{ update_id: 5 }, "unknown"],
  ];
  it.each(cases)("classifies %o as %s", (update, kind) => {
    expect(classifyUpdate(update)).toBe(kind);
  });

  it("prefers callback_query when multiple fields are present", () => {
    expect(
      classifyUpdate({ update_id: 6, callback_query: { id: "c", from: { id: 1 } }, message: {} }),
    ).toBe("callback_query");
  });
});
