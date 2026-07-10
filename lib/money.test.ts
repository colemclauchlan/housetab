import { describe, it, expect } from "vitest";
import { formatCents, parseDollarsToCents } from "@/lib/money";

describe("formatCents", () => {
  it("formats whole and fractional dollars with a thousands separator", () => {
    expect(formatCents(141550)).toBe("$1,415.50");
    expect(formatCents(14150)).toBe("$141.50");
    expect(formatCents(70000)).toBe("$700.00");
  });
  it("formats sub-dollar and zero amounts", () => {
    expect(formatCents(5)).toBe("$0.05");
    expect(formatCents(0)).toBe("$0.00");
  });
});

describe("parseDollarsToCents", () => {
  it("parses whole dollars", () => {
    expect(parseDollarsToCents("700")).toBe(70000);
    expect(parseDollarsToCents("0")).toBe(0);
  });
  it("parses one and two decimal places", () => {
    expect(parseDollarsToCents("141.5")).toBe(14150);
    expect(parseDollarsToCents("141.50")).toBe(14150);
    expect(parseDollarsToCents("0.05")).toBe(5);
  });
  it("tolerates $ and thousands separators and surrounding space", () => {
    expect(parseDollarsToCents(" $1,234.56 ")).toBe(123456);
    expect(parseDollarsToCents("$700")).toBe(70000);
  });
  it("avoids float error on tricky values", () => {
    // 0.1 + 0.2 style values that break naive parseFloat*100
    expect(parseDollarsToCents("0.10")).toBe(10);
    expect(parseDollarsToCents("35.35")).toBe(3535);
    expect(parseDollarsToCents("19.99")).toBe(1999);
  });
  it("rejects blanks, negatives, letters, and >2 decimals", () => {
    expect(() => parseDollarsToCents("")).toThrow();
    expect(() => parseDollarsToCents("   ")).toThrow();
    expect(() => parseDollarsToCents("-5")).toThrow();
    expect(() => parseDollarsToCents("abc")).toThrow();
    expect(() => parseDollarsToCents("1.234")).toThrow();
    expect(() => parseDollarsToCents("1.2.3")).toThrow();
  });
});
