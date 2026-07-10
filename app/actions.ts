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

// ─── Paid checklist (shares) ─────────────────────────────────────────────────

export async function markSharePaid(formData: FormData) {
  const periodId = String(formData.get("periodId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const amountCents = Number(formData.get("amountCents") ?? "0");
  if (!periodId || !memberId) backWithError("Missing share info.");

  const supabase = await createClient();
  const { error } = await supabase.from("shares").upsert(
    {
      period_id: periodId,
      member_id: memberId,
      amount_cents: Number.isFinite(amountCents) ? amountCents : 0,
      status: "paid",
      paid_at: new Date().toISOString(),
      paid_via: "admin",
    },
    { onConflict: "period_id,member_id" },
  );
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function unmarkShare(formData: FormData) {
  const periodId = String(formData.get("periodId") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  if (!periodId || !memberId) backWithError("Missing share info.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("shares")
    .update({ status: "pending", paid_at: null, paid_via: null })
    .eq("period_id", periodId)
    .eq("member_id", memberId);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function addMember(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const isAdmin = formData.get("is_admin") === "on";
  if (!name) backWithError("Enter a member name.");

  const supabase = await createClient();
  // Exactly one admin: demote any current admin before promoting a new one.
  if (isAdmin) {
    await supabase.from("members").update({ is_admin: false }).eq("is_admin", true);
  }
  const { error } = await supabase.from("members").insert({ name, is_admin: isAdmin });
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function renameMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id) backWithError("Missing member id.");
  if (!name) backWithError("Member name can’t be empty.");

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ name }).eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function setMemberActive(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  if (!id) backWithError("Missing member id.");

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ active }).eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function setMemberAdmin(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) backWithError("Missing member id.");

  const supabase = await createClient();
  // Single admin: demote the current admin, then promote this member.
  await supabase.from("members").update({ is_admin: false }).eq("is_admin", true);
  const { error } = await supabase
    .from("members")
    .update({ is_admin: true, active: true })
    .eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function unlinkMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) backWithError("Missing member id.");

  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ telegram_user_id: null }).eq("id", id);
  if (error) backWithError(error.message);

  revalidatePath("/");
  redirect("/");
}

export async function deleteMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) backWithError("Missing member id.");

  const supabase = await createClient();
  const { error } = await supabase.from("members").delete().eq("id", id);
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
