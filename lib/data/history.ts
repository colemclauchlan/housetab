import { createClient } from "@/lib/supabase/server";
import { torontoParts } from "@/lib/periods";
import { daysBetween } from "@/lib/reminders/schedule";
import type { Database } from "@/lib/database.types";

type PeriodStatus = Database["public"]["Enums"]["period_status"];

export interface HistoryPeriod {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  totalCents: number;
  memberCount: number;
  paidCount: number;
  /** Average days from announcement to payment across paid shares, or null. */
  avgDaysToPay: number | null;
}

/** All periods (newest first) with totals, paid counts, and average days-to-pay. */
export async function getHistory(): Promise<HistoryPeriod[]> {
  const supabase = await createClient();
  const { data: periods } = await supabase
    .from("periods")
    .select("*")
    .order("start_date", { ascending: false });
  if (!periods?.length) return [];

  const ids = periods.map((p) => p.id);
  const [{ data: bills }, { data: shares }] = await Promise.all([
    supabase.from("bills").select("period_id, amount_cents").in("period_id", ids),
    supabase.from("shares").select("period_id, status, paid_at").in("period_id", ids),
  ]);

  const totalByPeriod = new Map<string, number>();
  for (const b of bills ?? []) {
    totalByPeriod.set(b.period_id, (totalByPeriod.get(b.period_id) ?? 0) + b.amount_cents);
  }
  const sharesByPeriod = new Map<string, { status: string; paid_at: string | null }[]>();
  for (const s of shares ?? []) {
    const arr = sharesByPeriod.get(s.period_id) ?? [];
    arr.push(s);
    sharesByPeriod.set(s.period_id, arr);
  }

  return periods.map((p) => {
    const ps = sharesByPeriod.get(p.id) ?? [];
    const paid = ps.filter((s) => s.status === "paid");

    let avgDaysToPay: number | null = null;
    if (p.announced_at) {
      const announced = torontoParts(new Date(p.announced_at));
      const days = paid
        .filter((s) => s.paid_at)
        .map((s) => daysBetween(announced, torontoParts(new Date(s.paid_at as string))));
      if (days.length > 0) {
        avgDaysToPay = Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10;
      }
    }

    return {
      id: p.id,
      label: p.label,
      startDate: p.start_date,
      endDate: p.end_date,
      status: p.status,
      totalCents: totalByPeriod.get(p.id) ?? 0,
      memberCount: ps.length,
      paidCount: paid.length,
      avgDaysToPay,
    };
  });
}
