import { createServiceClient } from "@/lib/supabase/service";

/**
 * The webhook secret the route validates against — the same value
 * `ensureWebhookSecret` uses for `setWebhook`. Env var takes precedence (no DB
 * read, fail-closed); otherwise the app-generated settings value. Returns null if
 * neither is available, so the route rejects (401).
 */
export async function getEffectiveWebhookSecret(): Promise<string | null> {
  const envSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (envSecret) return envSecret;

  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "webhook_secret")
      .maybeSingle();
    return typeof data?.value === "string" && data.value.length > 0 ? data.value : null;
  } catch {
    return null;
  }
}
