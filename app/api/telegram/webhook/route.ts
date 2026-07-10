import { handleWebhookRequest } from "@/lib/telegram/webhook";
import { createServiceWebhookDeps } from "@/lib/telegram/service-deps";
import { getEffectiveWebhookSecret } from "@/lib/telegram/secret";

// Node.js runtime: uses the Supabase service client for event logging + dedupe.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const secret = await getEffectiveWebhookSecret();
  return handleWebhookRequest(req, createServiceWebhookDeps(), secret ?? undefined);
}
