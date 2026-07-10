import { createServiceClient } from "@/lib/supabase/service";
import { getBotTokenService } from "@/lib/telegram/token";
import { sendMessage } from "@/lib/telegram/api";

/** Are all active members paid? (Empty active set is never "settled".) */
export function allSettled(activeMemberIds: string[], paidMemberIds: Set<string>): boolean {
  return activeMemberIds.length > 0 && activeMemberIds.every((id) => paidMemberIds.has(id));
}

/**
 * If every active member has paid and the period isn't already closed, post the
 * "🎉 all settled" message and close the period (FR-19). Best-effort; returns
 * true if it closed the period.
 */
export async function maybeCloseIfSettled(periodId: string): Promise<boolean> {
  const supabase = createServiceClient();

  const { data: period } = await supabase
    .from("periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle();
  if (!period || period.status === "closed") return false;

  const [{ data: members }, { data: shares }] = await Promise.all([
    supabase.from("members").select("id").eq("active", true),
    supabase.from("shares").select("member_id, status").eq("period_id", periodId),
  ]);
  const activeIds = (members ?? []).map((m) => m.id);
  const paidIds = new Set(
    (shares ?? []).filter((s) => s.status === "paid").map((s) => s.member_id),
  );
  if (!allSettled(activeIds, paidIds)) return false;

  await supabase.from("periods").update({ status: "closed" }).eq("id", periodId);

  const token = await getBotTokenService();
  const { data: group } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "group_chat_id")
    .maybeSingle();
  const groupChatId = typeof group?.value === "number" ? group.value : null;
  if (token && groupChatId != null) {
    try {
      await sendMessage(
        token,
        groupChatId,
        `🎉 Everyone's settled for ${period.label}. Thanks, all!`,
      );
    } catch {
      // best-effort — the period is already closed in the DB
    }
  }
  return true;
}
