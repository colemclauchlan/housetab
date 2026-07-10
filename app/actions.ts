"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDollarsToCents } from "@/lib/money";
import {
  ensureCurrentPeriod,
  getBillWithPeriod,
  getSettings,
  setBillTypes,
} from "@/lib/data/dashboard";

function backWithError(message: string): never {
  redirect(`/?error=${encodeURIComponent(message)}`);
}

function parseAmountOrBack(raw: string): number {
  try {
    return parseDollarsToCents(raw);
  } catch {
    backWithError("Enter a valid amount, e.g. 62.50");
  }
}

export async function addBill(formData: FormData) {
  const type = String(formData.get("type") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const amountCents = parseAmountOrBack(String(formData.get("amount") ?? ""));

  if (!type) backWithError("Pick a bill type.");
  if (type === "Other" && !label) backWithError('Give the "Other" bill a label.');

  const periodId = await ensureCurrentPeriod();
  const supabase = await createClient();
  const { error } = await supabase.from("bills").insert({
    period_id: periodId,
    type,
    label: label || null,
    note: note || null,
    amount_cents: amountCents,
  });
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function updateBill(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const amountCents = parseAmountOrBack(String(formData.get("amount") ?? ""));

  if (!id) backWithError("Missing bill id.");
  if (!type) backWithError("Pick a bill type.");

  const found = await getBillWithPeriod(id);
  if (!found) backWithError("That bill no longer exists.");
  if (found.period.status === "closed") backWithError("This period is closed — edits are locked.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("bills")
    .update({ type, label: label || null, note: note || null, amount_cents: amountCents })
    .eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function deleteBill(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) backWithError("Missing bill id.");

  const found = await getBillWithPeriod(id);
  if (!found) {
    revalidatePath("/");
    redirect("/");
  }
  if (found.period.status === "closed") backWithError("This period is closed — edits are locked.");

  const supabase = await createClient();
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function renamePeriod(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!id) backWithError("Missing period id.");
  if (!label) backWithError("Period name can’t be empty.");

  const supabase = await createClient();
  const { error } = await supabase.from("periods").update({ label }).eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function addBillType(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) backWithError("Enter a bill-type name.");

  const { billTypes } = await getSettings();
  if (!billTypes.includes(name)) {
    await setBillTypes([...billTypes, name]);
  }
  revalidatePath("/");
  redirect("/");
}

export async function removeBillType(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const { billTypes } = await getSettings();
  await setBillTypes(billTypes.filter((t) => t !== name));
  revalidatePath("/");
  redirect("/");
}
