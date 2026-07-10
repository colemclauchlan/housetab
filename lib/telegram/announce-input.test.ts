import { describe, it, expect } from "vitest";
import { buildAnnouncementInput } from "@/lib/telegram/announce-input";

const members = [
  { id: "cole", name: "Cole", is_admin: true },
  { id: "jake", name: "Jake", is_admin: false },
  { id: "matt", name: "Matt", is_admin: false },
];

describe("buildAnnouncementInput", () => {
  it("computes total, even split, per-member amounts, and paid flags", () => {
    const input = buildAnnouncementInput({
      periodLabel: "Jun 15 – Jul 15",
      bills: [
        { type: "Rent", label: null, amount_cents: 30000 },
        { type: "Hydro", label: null, amount_cents: 100 },
      ],
      activeMembers: members,
      paidMemberIds: new Set(["jake"]),
    });

    expect(input.totalCents).toBe(30100);
    expect(input.activeCount).toBe(3);
    expect(input.perPersonCents).toBe(10033); // floor(30100/3)
    // Admin absorbs the +1 remainder (30100 - 3*10033 = 1).
    const cole = input.members.find((m) => m.name === "Cole")!;
    const jake = input.members.find((m) => m.name === "Jake")!;
    expect(cole.amountCents).toBe(10034);
    expect(jake.amountCents).toBe(10033);
    expect(jake.paid).toBe(true);
    expect(cole.paid).toBe(false);
    // Shares reconcile to the total.
    expect(input.members.reduce((a, m) => a + m.amountCents, 0)).toBe(30100);
  });

  it("passes a banner through for re-announce", () => {
    const input = buildAnnouncementInput({
      periodLabel: "L",
      bills: [{ type: "Rent", label: null, amount_cents: 600 }],
      activeMembers: members,
      paidMemberIds: new Set(),
      banner: "♻️ Updated breakdown",
    });
    expect(input.banner).toBe("♻️ Updated breakdown");
  });
});
