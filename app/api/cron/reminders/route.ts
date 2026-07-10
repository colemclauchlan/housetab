import { runDueReminders } from "@/lib/reminders/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Daily Vercel Cron entrypoint (FR-18). Protected by CRON_SECRET — Vercel sends
 * it as `Authorization: Bearer <CRON_SECRET>` when the env var is set.
 */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  try {
    const result = await runDueReminders();
    return Response.json(result);
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "error", { status: 500 });
  }
}
