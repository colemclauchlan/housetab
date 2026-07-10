import { createServiceClient } from "@/lib/supabase/service";
import type { TgUpdate } from "@/lib/telegram/updates";

/**
 * Pure: the group chat id to capture from an update, or null. Captures when the
 * bot is added to / present in a group (`my_chat_member`) or sees a `/start`
 * (optionally `/start@botname`) in a group. FR-23.
 */
export function groupChatToCapture(update: TgUpdate): number | null {
  const mcm = update.my_chat_member;
  if (mcm?.chat && (mcm.chat.type === "group" || mcm.chat.type === "supergroup")) {
    return mcm.chat.id;
  }

  const msg = update.message;
  if (
    msg?.chat &&
    (msg.chat.type === "group" || msg.chat.type === "supergroup") &&
    typeof msg.text === "string" &&
    /^\/start(@\w+)?\b/.test(msg.text.trim())
  ) {
    return msg.chat.id;
  }

  return null;
}

/**
 * If the update is a group-capture event and no group is confirmed yet, store the
 * chat id as `pending_group_chat_id` for the admin to confirm on the settings
 * page. Returns true if it captured (handled) the update.
 */
export async function maybeCaptureGroup(update: TgUpdate): Promise<boolean> {
  const chatId = groupChatToCapture(update);
  if (chatId == null) return false;

  const supabase = createServiceClient();
  const { data: confirmed } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "group_chat_id")
    .maybeSingle();
  // Don't let a stranger's group hijack an already-confirmed group.
  if (typeof confirmed?.value === "number") return false;

  await supabase
    .from("settings")
    .upsert(
      { key: "pending_group_chat_id", value: chatId, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  return true;
}
