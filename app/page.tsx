import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/money";
import { getCurrentPeriod, getSettings } from "@/lib/data/dashboard";
import { logout } from "./login/actions";
import {
  addBill,
  addBillType,
  deleteBill,
  removeBillType,
  renamePeriod,
  updateBill,
} from "./actions";

const inputCls =
  "rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20";
const primaryBtn =
  "rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90";
const secondaryBtn =
  "rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ billTypes, anchorDay }, current] = await Promise.all([
    getSettings(),
    getCurrentPeriod(),
  ]);
  const typeOptions = [...billTypes, "Other"];

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">HouseTab</h1>
          <p className="text-xs opacity-60">Signed in as {user?.email}</p>
        </div>
        <form action={logout}>
          <button className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100">
            Sign out
          </button>
        </form>
      </header>

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
        Even split among active members and the paid checklist land in M1.3–M1.4. Anchor day:{" "}
        {anchorDay}.
      </footer>
    </main>
  );
}
