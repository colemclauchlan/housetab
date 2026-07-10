import { createServiceClient } from "@/lib/supabase/service";
import { getBotTokenService } from "@/lib/telegram/token";
import { editMessageText, sendMessage } from "@/lib/telegram/api";
import { buildAnnouncement } from "@/lib/telegram/announce";
import { buildAnnouncementInput } from "@/lib/telegram/announce-input";

/**
 * Re-render the announcement message for a period with the current paid statuses
 * (FR-11). Called after a button tap (M3.1) or an admin override (M3.2). If the
 * message is too old to edit, posts a fresh status message and stores its id.
 * Best-effort: silently returns when the bot isn't fully configured.
 */
export async function refreshAnnouncement(periodId: string): Promise<void> {
  const token = await getBotTokenService();
  if (!token) return;

  const supabase = createServiceClient();

  const { data: group } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "group_chat_id")
    .maybeSingle();
  const groupChatId = typeof group?.value === "number" ? group.value : null;
  if (groupChatId == null) return;

  const { data: period } = await supabase
    .from("periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle();
  if (!period || period.announce_message_id == null) return;

  const [{ data: bills }, { data: members }, { data: shares }] = await Promise.all([
    supabase.from("bills").select("*").eq("period_id", periodId).order("created_at"),
    supabase
      .from("members")
      .select("*")
      .eq("active", true)
      .order("is_admin", { ascending: false })
      .order("created_at"),
    supabase.from("shares").select("*").eq("period_id", periodId),
  ]);

  const active = members ?? [];
  if (active.length === 0) return;
  const paidMemberIds = new Set(
    (shares ?? []).filter((s) => s.status === "paid").map((s) => s.member_id),
  );

  let input;
  try {
    input = buildAnnouncementInput({
      periodLabel: period.label,
      bills: (bills ?? []).map((b) => ({
        type: b.type,
        label: b.label,
        amount_cents: b.amount_cents,
      })),
      activeMembers: active.map((m) => ({ id: m.id, name: m.name, is_admin: m.is_admin })),
      paidMemberIds,
    });
  } catch {
    return; // e.g. >1 admin — nothing sensible to render
  }
  const message = buildAnnouncement(input);

  try {
    await editMessageText(token, groupChatId, period.announce_message_id, message.text, {
      reply_markup: message.reply_markup,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/not modified/i.test(msg)) return; // nothing changed — fine
    // Too old / message not found → post a fresh status message and repoint the id.
    try {
      const sent = await sendMessage(token, groupChatId, message.text, {
        reply_markup: message.reply_markup,
      });
      await supabase
        .from("periods")
        .update({ announce_message_id: sent.message_id })
        .eq("id", periodId);
    } catch {
      // give up silently
    }
  }
}
