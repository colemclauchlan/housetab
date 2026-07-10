import { createServiceClient } from "@/lib/supabase/service";

/**
 * The bot token in a service (webhook/cron) context: env var first, then the
 * settings row (single-tenant MVP). Returns null if neither is set.
 */
export async function getBotTokenService(): Promise<string | null> {
  const env = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (env) return env;
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "bot_token")
      .maybeSingle();
    return typeof data?.value === "string" && data.value.length > 0 ? data.value : null;
  } catch {
    return null;
  }
}
