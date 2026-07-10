import { createServiceClient } from "@/lib/supabase/service";
import { classifyUpdate } from "@/lib/telegram/updates";
import { dispatchUpdate } from "@/lib/telegram/dispatch";
import type { WebhookDeps } from "@/lib/telegram/webhook";
import type { Json } from "@/lib/database.types";

/** Production WebhookDeps backed by the Supabase service-role client. */
export function createServiceWebhookDeps(): WebhookDeps {
  return {
    async recordEvent(update) {
      const supabase = createServiceClient();
      // INSERT ... ON CONFLICT (update_id) DO NOTHING. A returned row means it was
      // newly inserted; an empty result means a duplicate (Telegram retry).
      const { data, error } = await supabase
        .from("events")
        .upsert(
          {
            update_id: update.update_id,
            type: classifyUpdate(update),
            payload: update as unknown as Json,
          },
          { onConflict: "update_id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw error;
      return (data?.length ?? 0) > 0;
    },

    async getGroupChatId() {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "group_chat_id")
        .maybeSingle();
      const value = data?.value;
      return typeof value === "number" ? value : null;
    },

    dispatch: dispatchUpdate,
  };
}
