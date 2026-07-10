import { describe, it, expect } from "vitest";
import { isPaidReply, isPaidReaction } from "@/lib/telegram/reply";

describe("isPaidReply — positives", () => {
  const yes = [
    "paid",
    "just paid ✅",
    "sent it",
    "done",
    "e-transfer sent",
    "etransferred",
    "I just sent my e-transfer 🙏",
    "✅",
    "Paid!",
  ];
  it.each(yes)("treats %j as paid", (t) => {
    expect(isPaidReply(t)).toBe(true);
  });
});

describe("isPaidReply — false positives rejected", () => {
  const no = [
    "who hasn't paid?",
    "not paid yet",
    "haven't paid",
    "did you pay?",
    "how do I e-transfer?",
    "when do we pay?",
    "🎉 thanks",
    "no one has paid",
    "",
    undefined,
  ];
  it.each(no)("does not treat %j as paid", (t) => {
    expect(isPaidReply(t as string | undefined)).toBe(false);
  });
});

describe("isPaidReaction", () => {
  it("accepts 👍 and ✅", () => {
    expect(isPaidReaction([{ type: "emoji", emoji: "👍" }])).toBe(true);
    expect(isPaidReaction([{ type: "emoji", emoji: "✅" }])).toBe(true);
  });
  it("rejects other reactions and empty", () => {
    expect(isPaidReaction([{ type: "emoji", emoji: "😂" }])).toBe(false);
    expect(isPaidReaction([])).toBe(false);
    expect(isPaidReaction(undefined)).toBe(false);
  });
});
