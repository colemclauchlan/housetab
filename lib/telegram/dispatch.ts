import type { TgUpdate } from "@/lib/telegram/updates";

/**
 * Handle a fresh in-group update. Real handlers (member linking, "✅ I've paid"
 * button taps, reply/reaction fallbacks) register here from M2.3 onward. For now
 * every update is still logged to `events` by the webhook, but produces no
 * outbound side effects.
 */
export async function dispatchUpdate(update: TgUpdate): Promise<void> {
  void update;
}
