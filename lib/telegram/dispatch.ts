import type { TgUpdate } from "@/lib/telegram/updates";
import { maybeCaptureGroup } from "@/lib/telegram/capture";
import { handleLinkCallback, parseLinkData } from "@/lib/telegram/linking";
import { createServiceLinkDeps } from "@/lib/telegram/link-deps";
import { PAID_CALLBACK } from "@/lib/telegram/announce";
import { handlePaidCallback } from "@/lib/telegram/paid";
import { createServicePaidDeps } from "@/lib/telegram/paid-deps";
import { isPaidReaction, isPaidReply } from "@/lib/telegram/reply";
import { recordPaidFromTelegram } from "@/lib/telegram/paid-record";

/**
 * Handle a fresh in-group update: group capture (M2.2) → member linking (M2.3) →
 * "I've paid" button taps (M3.1) → reply/reaction fallbacks (M4.4). Every update
 * is also logged to `events` by the webhook.
 */
export async function dispatchUpdate(update: TgUpdate): Promise<void> {
  if (await maybeCaptureGroup(update)) return;

  const cbq = update.callback_query;
  if (cbq && parseLinkData(cbq.data)) {
    await handleLinkCallback(cbq, createServiceLinkDeps());
    return;
  }
  if (cbq && cbq.data === PAID_CALLBACK) {
    await handlePaidCallback(cbq, createServicePaidDeps());
    return;
  }

  // Reply fallback: "paid"/"sent"/… as a reply to the announcement (FR-12).
  const msg = update.message;
  if (msg?.from && msg.reply_to_message?.message_id != null && isPaidReply(msg.text)) {
    await recordPaidFromTelegram(msg.from.id, msg.reply_to_message.message_id, "reply");
    return;
  }

  // Reaction fallback: 👍/✅ on the announcement (FR-13).
  const reaction = update.message_reaction;
  if (reaction?.user && reaction.message_id != null && isPaidReaction(reaction.new_reaction)) {
    await recordPaidFromTelegram(reaction.user.id, reaction.message_id, "reaction");
    return;
  }
}
