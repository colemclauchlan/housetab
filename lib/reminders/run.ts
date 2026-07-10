import { createServiceClient } from "@/lib/supabase/service";
import { getBotTokenService } from "@/lib/telegram/token";
import { sendMessage } from "@/lib/telegram/api";
import { buildReminderMessage } from "@/lib/telegram/reminder";
import { torontoParts } from "@/lib/periods";
import {
  DEFAULT_REMINDER_CONFIG,
  daysBetween,
  shouldRemindOnDay,
  type ReminderConfig,
} from "@/lib/reminders/schedule";

export interface RunResult {
  sent: boolean;
  reason: string;
  daysSince?: number;
  unpaidCount?: number;
}

export function parseReminderConfig(value: unknown): ReminderConfig {
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    return {
      enabled: v.enabled !== false,
      first_days: Array.isArray(v.first_days)
        ? v.first_days.filter((x): x is number => typeof x === "number")
        : DEFAULT_REMINDER_CONFIG.first_days,
      then_every_days:
        typeof v.then_every_days === "number"
          ? v.then_every_days
          : DEFAULT_REMINDER_CONFIG.then_every_days,
    };
  }
  return DEFAULT_REMINDER_CONFIG;
}

/**
 * Decide whether an auto-reminder is due today and, if so, post it. Idempotent
 * per day only insofar as the schedule fires once/day (the cron runs daily);
 * returns a structured result for the cron response/logs.
 */
export async function runDueReminders(now: Date = new Date()): Promise<RunResult> {
  const supabase = createServiceClient();

  const { data: settingsRows } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["reminders", "group_chat_id"]);
  const map = new Map((settingsRows ?? []).map((r) => [r.key, r.value]));

  const config = parseReminderConfig(map.get("reminders"));
  if (!config.enabled) return { sent: false, reason: "reminders disabled" };

  const groupChatId =
    typeof map.get("group_chat_id") === "number" ? (map.get("group_chat_id") as number) : null;
  if (groupChatId == null) return { sent: false, reason: "no group configured" };

  const token = await getBotTokenService();
  if (!token) return { sent: false, reason: "no bot token" };

  const { data: periods } = await supabase
    .from("periods")
    .select("*")
    .eq("status", "announced")
    .not("announced_at", "is", null)
    .order("announced_at", { ascending: false })
    .limit(1);
  const period = periods?.[0];
  if (!period || !period.announced_at) return { sent: false, reason: "no announced period" };

  const daysSince = daysBetween(torontoParts(new Date(period.announced_at)), torontoParts(now));
  if (!shouldRemindOnDay(daysSince, config)) {
    return { sent: false, reason: `day ${daysSince} is not a reminder day`, daysSince };
  }

  const [{ data: members }, { data: shares }] = await Promise.all([
    supabase
      .from("members")
      .select("*")
      .eq("active", true)
      .order("is_admin", { ascending: false })
      .order("created_at"),
    supabase.from("shares").select("*").eq("period_id", period.id),
  ]);
  const shareByMember = new Map((shares ?? []).map((s) => [s.member_id, s]));
  const unpaid = (members ?? [])
    .filter((m) => shareByMember.get(m.id)?.status !== "paid")
    .map((m) => ({
      name: m.name,
      telegramUserId: m.telegram_user_id,
      amountCents: shareByMember.get(m.id)?.amount_cents ?? 0,
    }));
  if (unpaid.length === 0) return { sent: false, reason: "everyone paid", daysSince };

  const msg = buildReminderMessage(unpaid);
  await sendMessage(token, groupChatId, msg.text, { parse_mode: msg.parse_mode });
  return { sent: true, reason: "reminder sent", daysSince, unpaidCount: unpaid.length };
}
