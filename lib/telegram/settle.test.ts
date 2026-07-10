import { describe, it, expect } from "vitest";
import { allSettled } from "@/lib/telegram/settle";

describe("allSettled", () => {
  it("is true when every active member has paid", () => {
    expect(allSettled(["a", "b", "c"], new Set(["a", "b", "c"]))).toBe(true);
  });
  it("is false when someone is unpaid", () => {
    expect(allSettled(["a", "b", "c"], new Set(["a", "b"]))).toBe(false);
  });
  it("is false with no active members", () => {
    expect(allSettled([], new Set())).toBe(false);
  });
  it("ignores paid ids that aren't active members", () => {
    expect(allSettled(["a", "b"], new Set(["a", "b", "ghost"]))).toBe(true);
  });
});
