import { describe, it, expect } from "vitest";
import { splitEven, sumBillCents, type SplitMember } from "@/lib/split";

/** Build a 6-member house: member 0 is the admin; all active unless overridden. */
function house(overrides: Partial<Record<number, Partial<SplitMember>>> = {}): SplitMember[] {
  const names = ["cole", "jake", "matt", "sam", "alex", "ben"];
  return names.map((id, i) => ({
    id,
    isAdmin: i === 0,
    active: true,
    ...overrides[i],
  }));
}

const sum = (shares: { amountCents: number }[]) => shares.reduce((a, s) => a + s.amountCents, 0);

describe("splitEven — core behavior", () => {
  it("PRD example: $849.00 / 6 = $141.50 each, no remainder", () => {
    const r = splitEven(84900, house());
    expect(r.activeCount).toBe(6);
    expect(r.perPersonCents).toBe(14150);
    expect(r.remainderCents).toBe(0);
    expect(r.shares).toHaveLength(6);
    expect(r.shares.every((s) => s.amountCents === 14150)).toBe(true);
    expect(sum(r.shares)).toBe(84900);
  });

  it("$0.01 remainder goes to the admin: $849.01 / 6", () => {
    const r = splitEven(84901, house());
    expect(r.perPersonCents).toBe(14150);
    expect(r.remainderCents).toBe(1);
    const admin = r.shares.find((s) => s.isAdmin)!;
    expect(admin.amountCents).toBe(14151); // 14150 + 1
    expect(r.shares.filter((s) => !s.isAdmin).every((s) => s.amountCents === 14150)).toBe(true);
    expect(sum(r.shares)).toBe(84901);
  });

  it("larger remainder ($1.00 / 6 = 16 + 16 + 16 + 16 + 16 + 20)", () => {
    const r = splitEven(100, house());
    expect(r.perPersonCents).toBe(16);
    expect(r.remainderCents).toBe(4);
    expect(r.shares.find((s) => s.isAdmin)!.amountCents).toBe(20);
    expect(sum(r.shares)).toBe(100);
  });

  it("sub-cent-per-person total: $0.05 / 6 → admin absorbs all 5 cents", () => {
    const r = splitEven(5, house());
    expect(r.perPersonCents).toBe(0);
    expect(r.remainderCents).toBe(5);
    expect(r.shares.find((s) => s.isAdmin)!.amountCents).toBe(5);
    expect(r.shares.filter((s) => !s.isAdmin).every((s) => s.amountCents === 0)).toBe(true);
    expect(sum(r.shares)).toBe(5);
  });

  it("zero total → everyone owes zero", () => {
    const r = splitEven(0, house());
    expect(r.remainderCents).toBe(0);
    expect(r.shares.every((s) => s.amountCents === 0)).toBe(true);
    expect(sum(r.shares)).toBe(0);
  });

  it("preserves input order and includes isAdmin flags", () => {
    const r = splitEven(100, house());
    expect(r.shares.map((s) => s.memberId)).toEqual(["cole", "jake", "matt", "sam", "alex", "ben"]);
    expect(r.shares.map((s) => s.isAdmin)).toEqual([true, false, false, false, false, false]);
  });
});

describe("splitEven — active/inactive divisor", () => {
  it("deactivating a member changes the divisor to /5", () => {
    const r = splitEven(84900, house({ 5: { active: false } })); // ben inactive
    expect(r.activeCount).toBe(5);
    expect(r.perPersonCents).toBe(16980); // 84900 / 5
    expect(r.remainderCents).toBe(0);
    expect(r.shares).toHaveLength(5);
    expect(r.shares.some((s) => s.memberId === "ben")).toBe(false);
    expect(sum(r.shares)).toBe(84900);
  });

  it("inactive members are excluded entirely (down to /3)", () => {
    const r = splitEven(
      1000,
      house({ 3: { active: false }, 4: { active: false }, 5: { active: false } }),
    );
    expect(r.activeCount).toBe(3);
    expect(r.perPersonCents).toBe(333);
    expect(r.remainderCents).toBe(1);
    expect(r.shares.find((s) => s.isAdmin)!.amountCents).toBe(334);
    expect(sum(r.shares)).toBe(1000);
  });

  it("single active member (the admin) owes the whole total", () => {
    const r = splitEven(
      12345,
      house({
        1: { active: false },
        2: { active: false },
        3: { active: false },
        4: { active: false },
        5: { active: false },
      }),
    );
    expect(r.activeCount).toBe(1);
    expect(r.shares).toHaveLength(1);
    expect(r.shares[0].amountCents).toBe(12345);
    expect(sum(r.shares)).toBe(12345);
  });
});

describe("splitEven — remainder holder fallback", () => {
  it("with no active admin, the remainder falls to the first active member", () => {
    // admin (index 0) inactive; remaining active members are all non-admins.
    const r = splitEven(101, house({ 0: { active: false } }));
    expect(r.activeCount).toBe(5);
    expect(r.perPersonCents).toBe(20);
    expect(r.remainderCents).toBe(1);
    // First active member is "jake" (index 1); it should hold the extra cent.
    const first = r.shares[0];
    expect(first.memberId).toBe("jake");
    expect(first.amountCents).toBe(21);
    expect(sum(r.shares)).toBe(101);
  });

  it("admin holds remainder even when not first in the list", () => {
    // Make member index 2 (matt) the admin, index 0 not admin.
    const members = house({ 0: { isAdmin: false }, 2: { isAdmin: true } });
    const r = splitEven(103, members);
    const admin = r.shares.find((s) => s.isAdmin)!;
    expect(admin.memberId).toBe("matt");
    expect(r.perPersonCents).toBe(17); // floor(103 / 6)
    expect(r.remainderCents).toBe(1);
    expect(admin.amountCents).toBe(r.perPersonCents + r.remainderCents); // 18
    expect(sum(r.shares)).toBe(103);
  });
});

describe("splitEven — input validation", () => {
  it("throws on zero active members", () => {
    expect(() =>
      splitEven(
        100,
        house({
          0: { active: false },
          1: { active: false },
          2: { active: false },
          3: { active: false },
          4: { active: false },
          5: { active: false },
        }),
      ),
    ).toThrow(/zero active/);
  });

  it("throws on an empty member list", () => {
    expect(() => splitEven(100, [])).toThrow(/zero active/);
  });

  it("throws on negative total", () => {
    expect(() => splitEven(-1, house())).toThrow(/>= 0/);
  });

  it("throws on non-integer total (float cents)", () => {
    expect(() => splitEven(100.5, house())).toThrow(/integer/);
  });

  it("throws when more than one active member is flagged admin", () => {
    const twoAdmins = house({ 1: { isAdmin: true } }); // cole + jake both admins
    expect(() => splitEven(103, twoAdmins)).toThrow(/at most one active admin/);
  });
});

describe("splitEven — exhaustive reconciliation sweep", () => {
  // Three member arrangements so the sweep exercises every remainder-holder branch
  // across the FULL total range (not just at a single remainder value):
  //   - adminFirst:  admin at active-index 0 (the normal case)
  //   - adminMid:    admin at a non-zero active-index (findIndex must locate it)
  //   - noAdmin:     no active admin -> fallback assigns remainder to first active
  const arrangements = {
    adminFirst: (n: number) => house().slice(0, n),
    adminMid: (n: number) =>
      // Put the admin at the last active index; only meaningful for n >= 2.
      house({ 0: { isAdmin: false }, [n - 1]: { isAdmin: true } }).slice(0, n),
    noAdmin: (n: number) => house({ 0: { isAdmin: false } }).slice(0, n),
  };

  for (const [name, build] of Object.entries(arrangements)) {
    it(`[${name}] shares sum exactly to the total, are non-negative, and the remainder holder is correct`, () => {
      for (let activeCount = 1; activeCount <= 6; activeCount++) {
        const members = build(activeCount);
        for (let total = 0; total <= 3000; total++) {
          const r = splitEven(total, members);

          // 1. Exact reconciliation — the invariant that matters most.
          expect(sum(r.shares)).toBe(total);

          // 2. Correct count and non-negativity.
          expect(r.shares).toHaveLength(activeCount);
          expect(r.shares.every((s) => s.amountCents >= 0)).toBe(true);

          // 3. Remainder is in [0, activeCount).
          expect(r.remainderCents).toBeGreaterThanOrEqual(0);
          expect(r.remainderCents).toBeLessThan(activeCount);

          // 4. When there's no remainder everyone pays the base; when there is,
          //    exactly one member absorbs it — and it's the admin (or, in the
          //    no-admin fallback, the first active member).
          const base = r.perPersonCents;
          if (r.remainderCents === 0) {
            expect(r.shares.every((s) => s.amountCents === base)).toBe(true);
          } else {
            const holders = r.shares.filter((s) => s.amountCents === base + r.remainderCents);
            const others = r.shares.filter((s) => s.amountCents === base);
            expect(holders).toHaveLength(1);
            expect(others).toHaveLength(activeCount - 1);

            const admin = r.shares.find((s) => s.isAdmin);
            const expectedHolder = admin ? admin.memberId : r.shares[0].memberId;
            expect(holders[0].memberId).toBe(expectedHolder);
          }
        }
      }
    });
  }
});

describe("sumBillCents", () => {
  it("sums integer-cent bill amounts", () => {
    expect(
      sumBillCents([{ amountCents: 70000 }, { amountCents: 2500 }, { amountCents: 6200 }]),
    ).toBe(78700);
  });
  it("returns 0 for no bills", () => {
    expect(sumBillCents([])).toBe(0);
  });
});
