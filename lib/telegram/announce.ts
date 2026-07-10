import { formatCents } from "@/lib/money";

export interface AnnouncementBill {
  type: string;
  label: string | null;
  amountCents: number;
}

export interface AnnouncementMember {
  name: string;
  amountCents: number;
  isAdmin: boolean;
  paid: boolean;
}

export interface AnnouncementInput {
  periodLabel: string;
  bills: AnnouncementBill[];
  totalCents: number;
  perPersonCents: number;
  activeCount: number;
  members: AnnouncementMember[];
  /** Prepended banner, e.g. "♻️ Updated breakdown" on a re-announce (M3.3). */
  banner?: string;
}

export interface AnnouncementMessage {
  text: string;
  reply_markup: { inline_keyboard: { text: string; callback_data: string }[][] };
}

/** Callback data for the "I've paid" button. */
export const PAID_CALLBACK = "paid";

function billName(b: AnnouncementBill): string {
  if (b.type === "Other") return b.label || "Other";
  return b.label ? `${b.type} (${b.label})` : b.type;
}

/** Build the group announcement message + inline button (PRD FR-8). */
export function buildAnnouncement(input: AnnouncementInput): AnnouncementMessage {
  const lines: string[] = [];
  if (input.banner) lines.push(input.banner, "");

  lines.push(`💸 ${formatCents(input.totalCents)} due this month (${input.periodLabel})`, "");

  for (const b of input.bills) {
    lines.push(`${formatCents(b.amountCents)} — ${billName(b)}`);
  }
  if (input.bills.length > 0) lines.push("");

  lines.push(
    `💰 Each person owes: ${formatCents(input.perPersonCents)} (even ${input.activeCount}-way split)`,
    "",
  );

  // Name grid, 3 per row, with ⬜/✅ status.
  const cells = input.members.map((m) => `${m.paid ? "✅" : "⬜"} ${m.name}`);
  for (let i = 0; i < cells.length; i += 3) {
    lines.push(cells.slice(i, i + 3).join("   "));
  }

  return {
    text: lines.join("\n"),
    reply_markup: {
      inline_keyboard: [[{ text: "✅ I've sent my e-transfer", callback_data: PAID_CALLBACK }]],
    },
  };
}
