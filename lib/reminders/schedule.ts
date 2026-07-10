import type { DateParts } from "@/lib/periods";

export interface ReminderConfig {
  enabled: boolean;
  /** Days after announcement to remind first (default [3, 7]). */
  first_days: number[];
  /** After the last first-day, remind every N days (default 3). */
  then_every_days: number;
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  enabled: true,
  first_days: [3, 7],
  then_every_days: 3,
};

/** Whole calendar days from `from` to `to` (both as date parts). */
export function daysBetween(from: DateParts, to: DateParts): number {
  const a = Date.UTC(from.year, from.month - 1, from.day);
  const b = Date.UTC(to.year, to.month - 1, to.day);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Should an auto-reminder fire `daysSince` days after the announcement? Fires on
 * each of `first_days`, then every `then_every_days` after the last of them
 * (FR-18). e.g. [3,7]+3 → days 3, 7, 10, 13, 16, …
 */
export function shouldRemindOnDay(
  daysSince: number,
  config: Pick<ReminderConfig, "first_days" | "then_every_days">,
): boolean {
  if (daysSince <= 0) return false;
  if (config.first_days.includes(daysSince)) return true;

  const lastFirst = config.first_days.length > 0 ? Math.max(...config.first_days) : 0;
  if (config.then_every_days > 0 && daysSince > lastFirst) {
    return (daysSince - lastFirst) % config.then_every_days === 0;
  }
  return false;
}
