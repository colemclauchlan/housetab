import { createServiceClient } from "@/lib/supabase/service";
import { refreshAnnouncement } from "@/lib/telegram/refresh";
import { maybeCloseIfSettled } from "@/lib/telegram/settle";
import type { Database } from "@/lib/database.types";

type PaidVia = Database["public"]["Enums"]["paid_via"];

export type RecordPaidOutcome = "paid" | "already" | "unlinked" | "no-period" | "no-share";

/**
 * Mark the member linked to `tgUserId` paid for the period whose announcement is
 * `messageId`, via a reply/reaction fallback (FR-12/FR-13). Refreshes the grid and
 * closes the period if everyone's now settled. Silent (no toast — these arrive as
 * group messages/reactions, not callbacks).
 */
export async function recordPaidFromTelegram(
  tgUserId: number,
  messageId: number,
  via: Extract<PaidVia, "reply" | "reaction">,
): Promise<RecordPaidOutcome> {
  const supabase = createServiceClient();

  const { data: member } = await supabase
    .from("members")
    .select("id")
    .eq("telegram_user_id", tgUserId)
    .maybeSingle();
  if (!member) return "unlinked";

  const { data: period } = await supabase
    .from("periods")
    .select("id")
    .eq("announce_message_id", messageId)
    .maybeSingle();
  if (!period) return "no-period";

  const { data: existing } = await supabase
    .from("shares")
    .select("status")
    .eq("period_id", period.id)
    .eq("member_id", member.id)
    .maybeSingle();
  if (!existing) return "no-share";
  if (existing.status === "paid") return "already";

  await supabase
    .from("shares")
    .update({ status: "paid", paid_at: new Date().toISOString(), paid_via: via })
    .eq("period_id", period.id)
    .eq("member_id", member.id)
    .neq("status", "paid");

  await refreshAnnouncement(period.id);
  await maybeCloseIfSettled(period.id);
  return "paid";
}
