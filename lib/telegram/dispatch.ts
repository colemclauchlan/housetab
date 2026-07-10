import type { TgUpdate } from "@/lib/telegram/updates";
import { maybeCaptureGroup } from "@/lib/telegram/capture";
import { handleLinkCallback, parseLinkData } from "@/lib/telegram/linking";
import { createServiceLinkDeps } from "@/lib/telegram/link-deps";
import { PAID_CALLBACK } from "@/lib/telegram/announce";
import { handlePaidCallback } from "@/lib/telegram/paid";
import { createServicePaidDeps } from "@/lib/telegram/paid-deps";

/**
 * Handle a fresh in-group update: group capture (M2.2) → member linking (M2.3) →
 * "I've paid" button taps (M3.1). Reply/reaction fallbacks register here from M4.
 * Every update is also logged to `events` by the webhook.
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

  // TODO(M4): reply/reaction fallbacks.
}
