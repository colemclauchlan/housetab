import { describe, it, expect } from "vitest";
import { computePeriodBounds, torontoParts } from "@/lib/periods";

describe("computePeriodBounds — anchor 15", () => {
  it("PRD example: mid-period date maps to May 15 – Jun 15", () => {
    expect(computePeriodBounds({ year: 2026, month: 5, day: 20 }, 15)).toEqual({
      startDate: "2026-05-15",
      endDate: "2026-06-15",
      label: "May 15 – Jun 15",
    });
  });

  it("on the anchor day, the new period starts (inclusive start)", () => {
    expect(computePeriodBounds({ year: 2026, month: 5, day: 15 }, 15)).toEqual({
      startDate: "2026-05-15",
      endDate: "2026-06-15",
      label: "May 15 – Jun 15",
    });
  });

  it("the day before the anchor belongs to the previous period", () => {
    expect(computePeriodBounds({ year: 2026, month: 5, day: 14 }, 15)).toEqual({
      startDate: "2026-04-15",
      endDate: "2026-05-15",
      label: "Apr 15 – May 15",
    });
  });

  it("rolls the year forward across December", () => {
    expect(computePeriodBounds({ year: 2026, month: 12, day: 20 }, 15)).toEqual({
      startDate: "2026-12-15",
      endDate: "2027-01-15",
      label: "Dec 15 – Jan 15",
    });
  });

  it("rolls the year backward across January", () => {
    expect(computePeriodBounds({ year: 2026, month: 1, day: 10 }, 15)).toEqual({
      startDate: "2025-12-15",
      endDate: "2026-01-15",
      label: "Dec 15 – Jan 15",
    });
  });
});

describe("computePeriodBounds — anchor clamping for short months", () => {
  it("clamps a 31 anchor to the last day of shorter months", () => {
    // today Feb 10 (< anchor), so period is Jan 31 – Feb 28 (2026 not leap).
    expect(computePeriodBounds({ year: 2026, month: 2, day: 10 }, 31)).toEqual({
      startDate: "2026-01-31",
      endDate: "2026-02-28",
      label: "Jan 31 – Feb 28",
    });
  });

  it("uses Feb 29 in a leap year", () => {
    expect(computePeriodBounds({ year: 2028, month: 2, day: 10 }, 31)).toEqual({
      startDate: "2028-01-31",
      endDate: "2028-02-29",
      label: "Jan 31 – Feb 29",
    });
  });

  it("day 1 with anchor 1 starts the current month", () => {
    expect(computePeriodBounds({ year: 2026, month: 6, day: 1 }, 1)).toEqual({
      startDate: "2026-06-01",
      endDate: "2026-07-01",
      label: "Jun 1 – Jul 1",
    });
  });
});

describe("computePeriodBounds — validation", () => {
  it("rejects out-of-range anchors", () => {
    expect(() => computePeriodBounds({ year: 2026, month: 5, day: 20 }, 0)).toThrow();
    expect(() => computePeriodBounds({ year: 2026, month: 5, day: 20 }, 32)).toThrow();
    expect(() => computePeriodBounds({ year: 2026, month: 5, day: 20 }, 15.5)).toThrow();
  });
});

describe("torontoParts", () => {
  it("returns Toronto calendar parts for a known instant", () => {
    // 2026-05-20T12:00:00Z is 08:00 EDT on May 20 in Toronto.
    expect(torontoParts(new Date("2026-05-20T12:00:00Z"))).toEqual({
      year: 2026,
      month: 5,
      day: 20,
    });
  });

  it("rolls to the previous Toronto day for a late-UTC instant", () => {
    // 2026-05-20T03:00:00Z is 23:00 EDT on May 19 in Toronto.
    expect(torontoParts(new Date("2026-05-20T03:00:00Z"))).toEqual({
      year: 2026,
      month: 5,
      day: 19,
    });
  });
});
