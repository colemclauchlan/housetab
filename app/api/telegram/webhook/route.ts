import { handleWebhookRequest } from "@/lib/telegram/webhook";
import { createServiceWebhookDeps } from "@/lib/telegram/service-deps";

// Node.js runtime: uses the Supabase service client (and grammY from M2.3).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  return handleWebhookRequest(req, createServiceWebhookDeps(), process.env.TELEGRAM_WEBHOOK_SECRET);
}
