import { createClient } from "@/lib/supabase/server";
import { computePeriodBounds, partsToISODate, torontoParts } from "@/lib/periods";
import type { Database } from "@/lib/database.types";

type Bill = Database["public"]["Tables"]["bills"]["Row"];
type Period = Database["public"]["Tables"]["periods"]["Row"];
type Member = Database["public"]["Tables"]["members"]["Row"];

/** All members, admin first then by creation order. */
export async function getMembers(): Promise<Member[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("*")
    .order("is_admin", { ascending: false })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export const DEFAULT_BILL_TYPES = ["Rent", "Hydro", "Electricity", "Gas", "Internet"];
export const DEFAULT_ANCHOR_DAY = 15;

export interface AppSettings {
  anchorDay: number;
  billTypes: string[];
}

/** Read app config from the settings table, with sensible fallbacks. */
export async function getSettings(): Promise<AppSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));

  const anchorRaw = map.get("anchor_day");
  const anchorDay = typeof anchorRaw === "number" ? anchorRaw : DEFAULT_ANCHOR_DAY;

  const typesRaw = map.get("bill_types");
  const billTypes =
    Array.isArray(typesRaw) && typesRaw.every((t) => typeof t === "string")
      ? (typesRaw as string[])
      : DEFAULT_BILL_TYPES;

  return { anchorDay, billTypes };
}

/** Persist the configurable bill-type list. */
export async function setBillTypes(billTypes: string[]): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ value: billTypes, updated_at: new Date().toISOString() })
    .eq("key", "bill_types");
  if (error) throw new Error(`failed to update bill types: ${error.message}`);
}

export interface CurrentPeriod {
  period: Period;
  bills: Bill[];
  totalCents: number;
}

/** The billing period whose window contains today (in Toronto), plus its bills. */
export async function getCurrentPeriod(): Promise<CurrentPeriod | null> {
  const supabase = await createClient();
  const today = partsToISODate(torontoParts(new Date()));

  const { data: periods } = await supabase
    .from("periods")
    .select("*")
    .lte("start_date", today)
    .gt("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1);

  const period = periods?.[0];
  if (!period) return null;

  const { data: bills } = await supabase
    .from("bills")
    .select("*")
    .eq("period_id", period.id)
    .order("created_at", { ascending: true });

  const list = bills ?? [];
  const totalCents = list.reduce((acc, b) => acc + b.amount_cents, 0);
  return { period, bills: list, totalCents };
}

/**
 * Ensure a billing period exists for today (auto-created on the first bill past
 * the anchor day, FR-2). Returns the period id.
 */
export async function ensureCurrentPeriod(): Promise<string> {
  const supabase = await createClient();
  const { anchorDay } = await getSettings();
  const bounds = computePeriodBounds(torontoParts(new Date()), anchorDay);

  const { data: existing } = await supabase
    .from("periods")
    .select("id")
    .eq("start_date", bounds.startDate)
    .limit(1);

  if (existing?.[0]) return existing[0].id;

  const { data: inserted, error } = await supabase
    .from("periods")
    .insert({ label: bounds.label, start_date: bounds.startDate, end_date: bounds.endDate })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(`failed to create period: ${error?.message ?? "unknown error"}`);
  }
  return inserted.id;
}

/** Look up a single bill (used to authorize edits/deletes against its period). */
export async function getBillWithPeriod(
  billId: string,
): Promise<{ bill: Bill; period: Period } | null> {
  const supabase = await createClient();
  const { data: bill } = await supabase.from("bills").select("*").eq("id", billId).maybeSingle();
  if (!bill) return null;
  const { data: period } = await supabase
    .from("periods")
    .select("*")
    .eq("id", bill.period_id)
    .maybeSingle();
  if (!period) return null;
  return { bill, period };
}
