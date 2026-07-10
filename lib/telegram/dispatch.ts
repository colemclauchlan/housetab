import type { TgUpdate } from "@/lib/telegram/updates";
import { maybeCaptureGroup } from "@/lib/telegram/capture";

/**
 * Handle a fresh in-group update. Group capture (M2.2) runs first; member
 * linking, "✅ I've paid" button taps, and reply/reaction fallbacks register here
 * from M2.3 onward. Every update is also logged to `events` by the webhook.
 */
export async function dispatchUpdate(update: TgUpdate): Promise<void> {
  if (await maybeCaptureGroup(update)) return;
  // TODO(M2.3+): member-linking callbacks, paid-button taps, reply/reaction fallbacks.
}
