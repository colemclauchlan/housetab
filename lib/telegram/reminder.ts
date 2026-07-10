import { formatCents } from "@/lib/money";

export interface ReminderMember {
  name: string;
  telegramUserId: number | null;
  amountCents: number;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** A linked member becomes a real @mention (pings them); an unlinked one is plain text. */
export function mentionHtml(m: ReminderMember): string {
  const name = escapeHtml(m.name);
  return m.telegramUserId != null ? `<a href="tg://user?id=${m.telegramUserId}">${name}</a>` : name;
}

/**
 * Build the "remind the unpaid" message (FR-17), mentioning only the unpaid
 * members (by Telegram user id) with the amount each still owes.
 */
export function buildReminderMessage(unpaid: ReminderMember[]): {
  text: string;
  parse_mode: "HTML";
} {
  const lines = unpaid.map((m) => `${mentionHtml(m)} — ${formatCents(m.amountCents)}`);
  const text = `⏰ Still owing this month:\n${lines.join("\n")}\n\nPlease send your e-transfer 🙏`;
  return { text, parse_mode: "HTML" };
}
