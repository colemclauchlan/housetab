import { describe, it, expect } from "vitest";
import { buildAnnouncement, PAID_CALLBACK, type AnnouncementInput } from "@/lib/telegram/announce";

const base: AnnouncementInput = {
  periodLabel: "May 15 – Jun 15",
  bills: [
    { type: "Rent", label: null, amountCents: 70000 },
    { type: "Hydro", label: null, amountCents: 2500 },
    { type: "Electricity", label: null, amountCents: 6200 },
    { type: "Gas", label: null, amountCents: 1100 },
    { type: "Internet", label: null, amountCents: 5100 },
  ],
  totalCents: 84900,
  perPersonCents: 14150,
  activeCount: 6,
  members: [
    { name: "Cole", amountCents: 14150, isAdmin: true, paid: false },
    { name: "Jake", amountCents: 14150, isAdmin: false, paid: false },
    { name: "Matt", amountCents: 14150, isAdmin: false, paid: false },
    { name: "Sam", amountCents: 14150, isAdmin: false, paid: false },
    { name: "Alex", amountCents: 14150, isAdmin: false, paid: false },
    { name: "Ben", amountCents: 14150, isAdmin: false, paid: false },
  ],
};

describe("buildAnnouncement", () => {
  it("matches the PRD FR-8 structure", () => {
    const { text } = buildAnnouncement(base);
    expect(text).toContain("💸 $849.00 due this month (May 15 – Jun 15)");
    expect(text).toContain("$700.00 — Rent");
    expect(text).toContain("$25.00 — Hydro");
    expect(text).toContain("💰 Each person owes: $141.50 (even 6-way split)");
  });

  it("renders a 3-per-row name grid with ⬜ for unpaid", () => {
    const { text } = buildAnnouncement(base);
    expect(text).toContain("⬜ Cole   ⬜ Jake   ⬜ Matt");
    expect(text).toContain("⬜ Sam   ⬜ Alex   ⬜ Ben");
  });

  it("shows ✅ next to paid members", () => {
    const input = {
      ...base,
      members: base.members.map((m, i) => (i < 2 ? { ...m, paid: true } : m)),
    };
    const { text } = buildAnnouncement(input);
    expect(text).toContain("✅ Cole   ✅ Jake   ⬜ Matt");
  });

  it("attaches the 'I've sent my e-transfer' inline button", () => {
    const { reply_markup } = buildAnnouncement(base);
    expect(reply_markup.inline_keyboard).toEqual([
      [{ text: "✅ I've sent my e-transfer", callback_data: PAID_CALLBACK }],
    ]);
  });

  it("labels an Other bill by its label, and prepends a banner on re-announce", () => {
    const { text } = buildAnnouncement({
      ...base,
      banner: "♻️ Updated breakdown",
      bills: [{ type: "Other", label: "Parking", amountCents: 5000 }],
    });
    expect(text.startsWith("♻️ Updated breakdown")).toBe(true);
    expect(text).toContain("$50.00 — Parking");
  });
});
