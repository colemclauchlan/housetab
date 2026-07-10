import Link from "next/link";
import { formatCents } from "@/lib/money";
import { getHistory } from "@/lib/data/history";

export const metadata = { title: "History · HouseTab" };

export default async function HistoryPage() {
  const periods = await getHistory();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">History</h1>
        <Link
          href="/"
          className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
        >
          ← Dashboard
        </Link>
      </header>

      {periods.length === 0 ? (
        <p className="text-sm opacity-60">No periods yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
          {periods.map((p) => (
            <li key={p.id} className="flex flex-col gap-1 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{p.label}</span>
                <span className="rounded-full border border-black/15 px-2 py-0.5 text-xs uppercase opacity-70 dark:border-white/20">
                  {p.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm opacity-80">
                <span>
                  Total <span className="font-mono">{formatCents(p.totalCents)}</span>
                </span>
                <span>
                  Paid {p.paidCount}/{p.memberCount}
                </span>
                <span>{p.avgDaysToPay != null ? `~${p.avgDaysToPay} days to pay` : "—"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
