import { describe, it, expect } from "vitest";
import { daysBetween, shouldRemindOnDay } from "@/lib/reminders/schedule";

const cfg = { first_days: [3, 7], then_every_days: 3 };

describe("shouldRemindOnDay — default [3,7] then every 3", () => {
  const fire = [3, 7, 10, 13, 16, 19];
  const skip = [0, 1, 2, 4, 5, 6, 8, 9, 11, 12, 14, 15];

  it.each(fire)("fires on day %i", (d) => {
    expect(shouldRemindOnDay(d, cfg)).toBe(true);
  });
  it.each(skip)("does not fire on day %i", (d) => {
    expect(shouldRemindOnDay(d, cfg)).toBe(false);
  });

  it("never fires before/at the announcement day", () => {
    expect(shouldRemindOnDay(0, cfg)).toBe(false);
    expect(shouldRemindOnDay(-1, cfg)).toBe(false);
  });

  it("with no recurrence, only the first_days fire", () => {
    const once = { first_days: [3, 7], then_every_days: 0 };
    expect(shouldRemindOnDay(10, once)).toBe(false);
    expect(shouldRemindOnDay(7, once)).toBe(true);
  });
});

describe("daysBetween", () => {
  it("counts whole calendar days", () => {
    expect(daysBetween({ year: 2026, month: 7, day: 10 }, { year: 2026, month: 7, day: 13 })).toBe(
      3,
    );
  });
  it("spans month boundaries", () => {
    expect(daysBetween({ year: 2026, month: 6, day: 28 }, { year: 2026, month: 7, day: 5 })).toBe(
      7,
    );
  });
  it("is zero for the same day", () => {
    expect(daysBetween({ year: 2026, month: 7, day: 10 }, { year: 2026, month: 7, day: 10 })).toBe(
      0,
    );
  });
});
