import type { TgCallbackQuery } from "@/lib/telegram/updates";

export type MarkPaidResult = "paid" | "already" | "no-share";

export interface PaidDeps {
  /** The member linked to this Telegram user, or null if unlinked. */
  getMemberByTelegramId(tgUserId: number): Promise<{ id: string; name: string } | null>;
  /** The period whose announcement is this message, or null. */
  getPeriodByAnnounceMessage(messageId: number): Promise<{ id: string } | null>;
  /** Mark the member's share paid (paid_via='button'); idempotent. */
  markPaid(periodId: string, memberId: string): Promise<MarkPaidResult>;
  /** Private toast back to the tapper. */
  answerCallback(callbackQueryId: string, text: string): Promise<void>;
  /** Fired after a fresh paid so the announcement grid can refresh (M3.2). */
  onPaid?(periodId: string): Promise<void>;
}

export type PaidOutcome = "paid" | "already" | "unlinked" | "no-period" | "no-share";

export interface PaidResult {
  outcome: PaidOutcome;
  memberId?: string;
  periodId?: string;
}

/**
 * Handle a tap on the "✅ I've sent my e-transfer" button (FR-10). Linked member →
 * paid + toast; unlinked → link prompt; duplicate → "already marked". Idempotent.
 */
export async function handlePaidCallback(
  cbq: TgCallbackQuery,
  deps: PaidDeps,
): Promise<PaidResult> {
  const member = await deps.getMemberByTelegramId(cbq.from.id);
  if (!member) {
    await deps.answerCallback(cbq.id, "Tap your name in the setup message to link first.");
    return { outcome: "unlinked" };
  }

  const messageId = cbq.message?.message_id;
  const period = messageId != null ? await deps.getPeriodByAnnounceMessage(messageId) : null;
  if (!period) {
    await deps.answerCallback(cbq.id, "This announcement is no longer active.");
    return { outcome: "no-period" };
  }

  const result = await deps.markPaid(period.id, member.id);
  if (result === "no-share") {
    await deps.answerCallback(cbq.id, "You're not in this month's split — ask the admin.");
    return { outcome: "no-share", memberId: member.id, periodId: period.id };
  }
  if (result === "already") {
    await deps.answerCallback(cbq.id, `Already marked you paid, ${member.name} ✅`);
    return { outcome: "already", memberId: member.id, periodId: period.id };
  }

  await deps.answerCallback(cbq.id, `Thanks ${member.name}, marked paid ✅`);
  if (deps.onPaid) await deps.onPaid(period.id);
  return { outcome: "paid", memberId: member.id, periodId: period.id };
}
