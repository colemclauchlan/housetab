import { createServiceClient } from "@/lib/supabase/service";
import { getBotTokenService } from "@/lib/telegram/token";
import { answerCallbackQuery } from "@/lib/telegram/api";
import type { PaidDeps } from "@/lib/telegram/paid";

/** Production PaidDeps backed by the Supabase service client + Bot API. */
export function createServicePaidDeps(): PaidDeps {
  return {
    async getMemberByTelegramId(tgUserId) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("members")
        .select("id, name")
        .eq("telegram_user_id", tgUserId)
        .maybeSingle();
      return data ?? null;
    },

    async getPeriodByAnnounceMessage(messageId) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("periods")
        .select("id")
        .eq("announce_message_id", messageId)
        .maybeSingle();
      return data ?? null;
    },

    async markPaid(periodId, memberId) {
      const supabase = createServiceClient();
      const { data: existing } = await supabase
        .from("shares")
        .select("status")
        .eq("period_id", periodId)
        .eq("member_id", memberId)
        .maybeSingle();
      if (!existing) return "no-share";
      if (existing.status === "paid") return "already";

      const { error } = await supabase
        .from("shares")
        .update({ status: "paid", paid_at: new Date().toISOString(), paid_via: "button" })
        .eq("period_id", periodId)
        .eq("member_id", memberId)
        .neq("status", "paid");
      return error ? "already" : "paid";
    },

    async answerCallback(callbackQueryId, text) {
      const token = await getBotTokenService();
      if (!token) return;
      try {
        await answerCallbackQuery(token, callbackQueryId, text);
      } catch {
        // best-effort toast
      }
    },

    // onPaid (live announcement grid refresh) is wired in M3.2.
  };
}
