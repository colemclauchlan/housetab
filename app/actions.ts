"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseDollarsToCents } from "@/lib/money";
import {
  ensureCurrentPeriod,
  getBillWithPeriod,
  getCurrentPeriod,
  getMembers,
  getPeriodShares,
  getSettings,
  setBillTypes,
} from "@/lib/data/dashboard";
import { getBotConfig } from "@/lib/data/bot";
import { splitEven } from "@/lib/split";
import { sendMessage } from "@/lib/telegram/api";
import { buildLinkingMessage } from "@/lib/telegram/linking";
import { buildAnnouncement } from "@/lib/telegram/announce";
import { buildReminderMessage } from "@/lib/telegram/reminder";
import { refreshAnnouncement } from "@/lib/telegram/refresh";

/** Best-effort: reflect a status change in the group chat; never block the admin. */
async function refreshChat(periodId: string, banner?: string): Promise<void> {
  try {
    await refreshAnnouncement(periodId, banner);
  } catch {
    // ignore — the dashboard is the source of truth; the chat is a mirror
  }
}

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

  await refreshChat(periodId);
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

  await refreshChat(periodId);
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

export async function announce() {
  const cfg = await getBotConfig();
  if (!cfg.token) backWithError("Set the bot token in Settings first.");
  if (cfg.groupChatId == null || !cfg.groupConfirmed) {
    backWithError("Confirm the house group in Settings first.");
  }

  const current = await getCurrentPeriod();
  if (!current) backWithError("No open period to announce.");
  if (current.period.status !== "open") {
    backWithError("Already announced. Edit a bill to re-announce (coming in M3.3).");
  }

  const members = (await getMembers()).filter((m) => m.active);
  if (members.length === 0) backWithError("Add members before announcing.");

  let preview: ReturnType<typeof splitEven>;
  try {
    preview = splitEven(
      current.totalCents,
      members.map((m) => ({ id: m.id, isAdmin: m.is_admin, active: true })),
    );
  } catch (e) {
    backWithError(e instanceof Error ? e.message : "Cannot compute the split.");
  }
  const amountByMember = new Map(preview.shares.map((s) => [s.memberId, s.amountCents]));

  const supabase = await createClient();
  // Freeze shares — set each active member's amount (a new row defaults to pending;
  // an existing row keeps its paid status).
  const { error: freezeError } = await supabase.from("shares").upsert(
    members.map((m) => ({
      period_id: current.period.id,
      member_id: m.id,
      amount_cents: amountByMember.get(m.id) ?? 0,
    })),
    { onConflict: "period_id,member_id" },
  );
  if (freezeError) backWithError(freezeError.message);

  const shares = await getPeriodShares(current.period.id);
  const message = buildAnnouncement({
    periodLabel: current.period.label,
    bills: current.bills.map((b) => ({
      type: b.type,
      label: b.label,
      amountCents: b.amount_cents,
    })),
    totalCents: current.totalCents,
    perPersonCents: preview.perPersonCents,
    activeCount: preview.activeCount,
    members: members.map((m) => ({
      name: m.name,
      amountCents: amountByMember.get(m.id) ?? 0,
      isAdmin: m.is_admin,
      paid: shares.get(m.id)?.status === "paid",
    })),
  });

  let sent;
  try {
    sent = await sendMessage(cfg.token, cfg.groupChatId, message.text, {
      reply_markup: message.reply_markup,
    });
  } catch (e) {
    backWithError(e instanceof Error ? e.message : "Failed to send the announcement.");
  }

  await supabase
    .from("periods")
    .update({
      status: "announced",
      announce_message_id: sent.message_id,
      announced_at: new Date().toISOString(),
    })
    .eq("id", current.period.id);

  revalidatePath("/");
  redirect(`/?ok=${encodeURIComponent("Announced to the group.")}`);
}

export async function remindUnpaid() {
  const cfg = await getBotConfig();
  if (!cfg.token) backWithError("Set the bot token in Settings first.");
  if (cfg.groupChatId == null || !cfg.groupConfirmed) {
    backWithError("Confirm the house group in Settings first.");
  }

  const current = await getCurrentPeriod();
  if (!current || current.period.status === "open") {
    backWithError("Announce the period before sending reminders.");
  }

  const members = (await getMembers()).filter((m) => m.active);
  const shares = await getPeriodShares(current.period.id);
  const unpaid = members
    .filter((m) => shares.get(m.id)?.status !== "paid")
    .map((m) => ({
      name: m.name,
      telegramUserId: m.telegram_user_id,
      amountCents: shares.get(m.id)?.amount_cents ?? 0,
    }));

  if (unpaid.length === 0) backWithError("Everyone's paid — nothing to remind! 🎉");

  const msg = buildReminderMessage(unpaid);
  try {
    await sendMessage(cfg.token, cfg.groupChatId, msg.text, { parse_mode: msg.parse_mode });
  } catch (e) {
    backWithError(e instanceof Error ? e.message : "Failed to send the reminder.");
  }

  redirect(`/?ok=${encodeURIComponent(`Reminded ${unpaid.length} unpaid member(s).`)}`);
}

export async function reannounce() {
  const cfg = await getBotConfig();
  if (!cfg.token) backWithError("Set the bot token in Settings first.");
  if (cfg.groupChatId == null || !cfg.groupConfirmed) {
    backWithError("Confirm the house group in Settings first.");
  }

  const current = await getCurrentPeriod();
  if (!current) backWithError("No period to re-announce.");
  if (current.period.status !== "announced") {
    backWithError("Announce first before re-announcing.");
  }

  const members = (await getMembers()).filter((m) => m.active);
  if (members.length === 0) backWithError("Add members first.");

  let preview: ReturnType<typeof splitEven>;
  try {
    preview = splitEven(
      current.totalCents,
      members.map((m) => ({ id: m.id, isAdmin: m.is_admin, active: true })),
    );
  } catch (e) {
    backWithError(e instanceof Error ? e.message : "Cannot compute the split.");
  }
  const amountByMember = new Map(preview.shares.map((s) => [s.memberId, s.amountCents]));

  // Per-person amount changed vs the frozen shares?
  const frozen = await getPeriodShares(current.period.id);
  const amountsChanged = members.some(
    (m) => frozen.get(m.id)?.amount_cents !== amountByMember.get(m.id),
  );

  const supabase = await createClient();
  const rows = members.map((m) => ({
    period_id: current.period.id,
    member_id: m.id,
    amount_cents: amountByMember.get(m.id) ?? 0,
    // If the amount changed, reset paid checks (FR-9); otherwise leave them.
    ...(amountsChanged ? { status: "pending" as const, paid_at: null, paid_via: null } : {}),
  }));
  const { error } = await supabase
    .from("shares")
    .upsert(rows, { onConflict: "period_id,member_id" });
  if (error) backWithError(error.message);

  const banner = amountsChanged
    ? "♻️ Updated breakdown — the amount changed, so paid checks were reset."
    : "♻️ Updated breakdown";
  await refreshChat(current.period.id, banner);

  revalidatePath("/");
  redirect(
    `/?ok=${encodeURIComponent(
      amountsChanged
        ? "Re-announced — amounts changed, paid checks reset."
        : "Re-announced to the group.",
    )}`,
  );
}

export async function postLinkingMessage() {
  const cfg = await getBotConfig();
  if (!cfg.token) backWithError("Set the bot token in Settings first.");
  if (cfg.groupChatId == null || !cfg.groupConfirmed) {
    backWithError("Confirm the house group in Settings first.");
  }

  const active = (await getMembers()).filter((m) => m.active);
  if (active.length === 0) backWithError("Add members before posting the linking message.");

  const { text, reply_markup } = buildLinkingMessage(
    active.map((m) => ({ id: m.id, name: m.name })),
  );
  try {
    await sendMessage(cfg.token, cfg.groupChatId, text, { reply_markup });
  } catch (e) {
    backWithError(e instanceof Error ? e.message : "Failed to post the linking message.");
  }

  revalidatePath("/");
  redirect(`/?ok=${encodeURIComponent("Linking message posted to the group.")}`);
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
