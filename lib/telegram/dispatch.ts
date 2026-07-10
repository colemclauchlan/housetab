import type { TgUpdate } from "@/lib/telegram/updates";
import { maybeCaptureGroup } from "@/lib/telegram/capture";
import { handleLinkCallback, parseLinkData } from "@/lib/telegram/linking";
import { createServiceLinkDeps } from "@/lib/telegram/link-deps";

/**
 * Handle a fresh in-group update. Group capture (M2.2) runs first, then member
 * linking (M2.3). Paid-button taps and reply/reaction fallbacks register here
 * from M3 onward. Every update is also logged to `events` by the webhook.
 */
export async function dispatchUpdate(update: TgUpdate): Promise<void> {
  if (await maybeCaptureGroup(update)) return;

  const cbq = update.callback_query;
  if (cbq && parseLinkData(cbq.data)) {
    await handleLinkCallback(cbq, createServiceLinkDeps());
    return;
  }

  // TODO(M3): paid-button taps, reply/reaction fallbacks.
}
