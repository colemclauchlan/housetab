import { createServiceClient } from "@/lib/supabase/service";
import { getBotTokenService } from "@/lib/telegram/token";
import { answerCallbackQuery } from "@/lib/telegram/api";
import type { LinkDeps } from "@/lib/telegram/linking";

/** Production LinkDeps backed by the Supabase service client + Bot API. */
export function createServiceLinkDeps(): LinkDeps {
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

    async getMember(memberId) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("members")
        .select("id, name, telegram_user_id")
        .eq("id", memberId)
        .maybeSingle();
      return data ?? null;
    },

    async linkMember(memberId, tgUserId) {
      const supabase = createServiceClient();
      // Atomic first-come claim: only link if still unclaimed.
      const { data, error } = await supabase
        .from("members")
        .update({ telegram_user_id: tgUserId })
        .eq("id", memberId)
        .is("telegram_user_id", null)
        .select("id");
      if (error) return false; // e.g. unique violation → treat as lost race
      return (data?.length ?? 0) > 0;
    },

    async answerCallback(callbackQueryId, text) {
      const token = await getBotTokenService();
      if (!token) return;
      try {
        await answerCallbackQuery(token, callbackQueryId, text);
      } catch {
        // best-effort toast; never fail the webhook over it
      }
    },
  };
}
