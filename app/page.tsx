import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/money";
import { splitEven } from "@/lib/split";
import type { Database } from "@/lib/database.types";
import { getCurrentPeriod, getMembers, getPeriodShares, getSettings } from "@/lib/data/dashboard";
import { logout } from "./login/actions";
import {
  addBill,
  addBillType,
  addMember,
  announce,
  deleteBill,
  deleteMember,
  markSharePaid,
  postLinkingMessage,
  removeBillType,
  renameMember,
  renamePeriod,
  setMemberActive,
  setMemberAdmin,
  unlinkMember,
  unmarkShare,
  updateBill,
} from "./actions";

type Share = Database["public"]["Tables"]["shares"]["Row"];

const torontoDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const inputCls =
  "rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20";
const primaryBtn =
  "rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90";
const secondaryBtn =
  "rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ billTypes, anchorDay }, current, members] = await Promise.all([
    getSettings(),
    getCurrentPeriod(),
    getMembers(),
  ]);
  const typeOptions = [...billTypes, "Other"];
  const activeMembers = members.filter((m) => m.active);
  const memberById = new Map(members.map((m) => [m.id, m]));

  // Live per-person preview of the current period's even split (frozen at Announce, M2.4).
  let preview: ReturnType<typeof splitEven> | null = null;
  let previewError: string | null = null;
  if (current && activeMembers.length > 0) {
    try {
      preview = splitEven(
        current.totalCents,
        activeMembers.map((m) => ({ id: m.id, isAdmin: m.is_admin, active: true })),
      );
    } catch (e) {
      previewError = e instanceof Error ? e.message : "cannot compute split";
    }
  }

  // Paid/unpaid status per member for the current period.
  const shares: Map<string, Share> = current ? await getPeriodShares(current.period.id) : new Map();
  const paidCount = preview
    ? preview.shares.filter((s) => shares.get(s.memberId)?.status === "paid").length
    : 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">HouseTab</h1>
          <p className="text-xs opacity-60">Signed in as {user?.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            Settings
          </Link>
          <form action={logout}>
            <button className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100">
              Sign out
            </button>
          </form>
        </div>
      </header>

      {ok ? (
        <p className="rounded border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          {current ? (
            <form action={renamePeriod} className="flex items-baseline gap-2">
              <input type="hidden" name="id" value={current.period.id} />
              <input
                name="label"
                defaultValue={current.period.label}
                aria-label="Period name"
                className="w-56 max-w-full border-b border-transparent bg-transparent text-lg font-medium hover:border-black/20 focus:border-black/40 focus:outline-none dark:hover:border-white/20 dark:focus:border-white/40"
              />
              <button
                type="submit"
                className="text-xs underline underline-offset-2 opacity-50 hover:opacity-100"
              >
                Rename
              </button>
            </form>
          ) : (
            <h2 className="text-lg font-medium">No open period yet</h2>
          )}
          {current ? (
            <span className="rounded-full border border-black/15 px-2 py-0.5 text-xs uppercase opacity-70 dark:border-white/20">
              {current.period.status}
            </span>
          ) : null}
        </div>

        {current && current.bills.length > 0 ? (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {current.bills.map((bill) => (
              <li key={bill.id} className="py-3">
                <form action={updateBill} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={bill.id} />
                  <label className="flex flex-col gap-1 text-xs opacity-70">
                    Type
                    <select
                      name="type"
                      defaultValue={typeOptions.includes(bill.type) ? bill.type : "Other"}
                      className={inputCls}
                    >
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-xs opacity-70">
                    Label
                    <input
                      name="label"
                      defaultValue={bill.label ?? ""}
                      className={`${inputCls} w-24`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs opacity-70">
                    Amount
                    <input
                      name="amount"
                      inputMode="decimal"
                      defaultValue={(bill.amount_cents / 100).toFixed(2)}
                      className={`${inputCls} w-24`}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-xs opacity-70">
                    Note
                    <input
                      name="note"
                      defaultValue={bill.note ?? ""}
                      className={`${inputCls} w-full`}
                    />
                  </label>
                  <button type="submit" className={secondaryBtn}>
                    Save
                  </button>
                  <button type="submit" formAction={deleteBill} className={secondaryBtn}>
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">
            {current ? "No bills yet." : "Add the first bill below to start this month’s period."}
          </p>
        )}

        {current ? (
          <div className="flex items-center justify-between border-t border-black/10 pt-3 dark:border-white/10">
            <span className="text-sm font-medium">Total</span>
            <span className="font-mono text-lg">{formatCents(current.totalCents)}</span>
          </div>
        ) : null}

        {current && preview ? (
          <div className="flex items-center justify-between text-sm">
            <span className="opacity-70">Each owes ({preview.activeCount}-way split)</span>
            <span className="font-mono">
              {formatCents(preview.perPersonCents)}
              {preview.remainderCents > 0 ? (
                <span className="opacity-60">
                  {" "}
                  · admin {formatCents(preview.perPersonCents + preview.remainderCents)}
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
        {current && activeMembers.length === 0 ? (
          <p className="text-xs opacity-60">Add members below to see each person’s share.</p>
        ) : null}
        {current && previewError ? (
          <p className="text-xs text-red-600 dark:text-red-400">Can’t split: {previewError}</p>
        ) : null}

        {current && preview ? (
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium opacity-80">
              Paid checklist · {paidCount}/{preview.activeCount} paid
            </h3>
            <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/5">
              {preview.shares.map((s) => {
                const member = memberById.get(s.memberId);
                const share = shares.get(s.memberId);
                const paid = share?.status === "paid";
                return (
                  <li
                    key={s.memberId}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
                  >
                    <span className="min-w-24">
                      {paid ? "✅" : "⬜"} {member?.name ?? "—"}
                      {s.isAdmin ? <span className="opacity-50"> (admin)</span> : null}
                    </span>
                    <span className="font-mono">{formatCents(s.amountCents)}</span>
                    <span className="text-xs opacity-50">
                      {paid && share?.paid_at
                        ? `${torontoDateTime.format(new Date(share.paid_at))} · ${share.paid_via}`
                        : ""}
                    </span>
                    <form action={paid ? unmarkShare : markSharePaid} className="ml-auto">
                      <input type="hidden" name="periodId" value={current.period.id} />
                      <input type="hidden" name="memberId" value={s.memberId} />
                      <input type="hidden" name="amountCents" value={s.amountCents} />
                      <button type="submit" className={secondaryBtn}>
                        {paid ? "Unmark" : "Mark paid"}
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {current && current.period.status === "open" ? (
          <form action={announce} className="pt-1">
            <button type="submit" className={primaryBtn}>
              📣 Announce to the group
            </button>
          </form>
        ) : current ? (
          <p className="pt-1 text-xs opacity-60">
            Announced
            {current.period.announce_message_id
              ? ` · message #${current.period.announce_message_id}`
              : ""}
            . Edit a bill to re-announce (M3.3).
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Add a bill</h2>
        <form id="add-bill-form" action={addBill} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs opacity-70">
            Type
            <select name="type" required defaultValue="" className={inputCls}>
              <option value="" disabled>
                Pick…
              </option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs opacity-70">
            Label (optional)
            <input name="label" placeholder="e.g. Water" className={`${inputCls} w-28`} />
          </label>
          <label className="flex flex-col gap-1 text-xs opacity-70">
            Amount (CAD)
            <input
              name="amount"
              required
              inputMode="decimal"
              placeholder="0.00"
              className={`${inputCls} w-28`}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs opacity-70">
            Note (optional)
            <input name="note" className={`${inputCls} w-full`} />
          </label>
          <button type="submit" className={primaryBtn}>
            Add bill
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium">Members ({activeMembers.length} active)</h2>
          <form action={postLinkingMessage}>
            <button type="submit" className={secondaryBtn}>
              Post name buttons to group
            </button>
          </form>
        </div>
        {members.length > 0 ? (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {members.map((m) => (
              <li
                key={m.id}
                className={`flex flex-wrap items-center gap-2 py-2 ${m.active ? "" : "opacity-50"}`}
              >
                <form action={renameMember} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={m.id} />
                  <input name="name" defaultValue={m.name} className={`${inputCls} w-32`} />
                  <button
                    type="submit"
                    className="text-xs underline underline-offset-2 opacity-50 hover:opacity-100"
                  >
                    Save
                  </button>
                </form>

                {m.is_admin ? (
                  <span className="rounded-full border border-black/15 px-2 py-0.5 text-xs opacity-70 dark:border-white/20">
                    admin
                  </span>
                ) : (
                  <form action={setMemberAdmin}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="text-xs underline underline-offset-2 opacity-50 hover:opacity-100"
                    >
                      Make admin
                    </button>
                  </form>
                )}

                <span className="text-xs opacity-60">
                  {m.telegram_user_id ? "🔗 linked" : "not linked"}
                </span>
                {m.telegram_user_id ? (
                  <form action={unlinkMember}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="text-xs underline underline-offset-2 opacity-50 hover:opacity-100"
                    >
                      Unlink
                    </button>
                  </form>
                ) : null}

                <form action={setMemberActive} className="ml-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="active" value={m.active ? "false" : "true"} />
                  <button type="submit" className={secondaryBtn}>
                    {m.active ? "Deactivate" : "Activate"}
                  </button>
                </form>
                <form action={deleteMember}>
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className={secondaryBtn}>
                    Delete
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-60">No members yet. Add the household below.</p>
        )}

        <form id="add-member-form" action={addMember} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs opacity-70">
            Name
            <input name="name" required placeholder="e.g. Jake" className={inputCls} />
          </label>
          <label className="flex items-center gap-1 text-xs opacity-70">
            <input type="checkbox" name="is_admin" /> admin
          </label>
          <button type="submit" className={secondaryBtn}>
            Add member
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Bill types</h2>
        <div className="flex flex-wrap gap-2">
          {billTypes.map((t) => (
            <form
              key={t}
              action={removeBillType}
              className="flex items-center gap-1 rounded-full border border-black/15 px-2 py-1 text-xs dark:border-white/20"
            >
              <input type="hidden" name="name" value={t} />
              <span>{t}</span>
              <button
                type="submit"
                aria-label={`Remove ${t}`}
                className="opacity-50 hover:opacity-100"
              >
                ×
              </button>
            </form>
          ))}
        </div>
        <form action={addBillType} className="flex items-end gap-2">
          <label className="flex flex-col gap-1 text-xs opacity-70">
            New type
            <input name="name" placeholder="e.g. Water" className={inputCls} />
          </label>
          <button type="submit" className={secondaryBtn}>
            Add type
          </button>
        </form>
      </section>

      <footer className="text-xs opacity-40">
        The paid checklist and Telegram announce land in M1.4 / M2. Anchor day: {anchorDay}.
      </footer>
    </main>
  );
}
