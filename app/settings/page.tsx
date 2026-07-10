import Link from "next/link";
import { getBotConfig } from "@/lib/data/bot";
import { getMe, getWebhookInfo, type BotInfo, type WebhookInfo } from "@/lib/telegram/api";
import { clearGroup, confirmGroup, registerWebhook, saveBotToken } from "./actions";

export const metadata = { title: "Settings · HouseTab" };

const inputCls =
  "w-full rounded border border-black/15 bg-transparent px-2 py-1 text-sm dark:border-white/20";
const primaryBtn =
  "rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90";
const secondaryBtn =
  "rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { ok, error } = await searchParams;
  const cfg = await getBotConfig();

  let bot: BotInfo | null = null;
  let webhook: WebhookInfo | null = null;
  let healthError: string | null = null;
  if (cfg.token) {
    try {
      [bot, webhook] = await Promise.all([getMe(cfg.token), getWebhookInfo(cfg.token)]);
    } catch (e) {
      healthError = e instanceof Error ? e.message : "Telegram API call failed.";
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Bot settings</h1>
        <Link
          href="/"
          className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
        >
          ← Dashboard
        </Link>
      </header>

      {ok ? (
        <p className="rounded border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300">
          {ok}
        </p>
      ) : null}
      {error ? (
        <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {/* ── Bot token ─────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">1 · Bot token</h2>
        <p className="text-sm opacity-70">
          Create a bot with{" "}
          <a className="underline" href="https://t.me/BotFather" target="_blank" rel="noreferrer">
            @BotFather
          </a>{" "}
          (<code>/newbot</code>), then paste the token here.
        </p>
        <p className="text-sm">
          Status:{" "}
          {cfg.token ? (
            <span className="opacity-80">
              set (from {cfg.tokenSource}){bot ? ` · bot is @${bot.username}` : ""}
            </span>
          ) : (
            <span className="opacity-60">no token yet</span>
          )}
        </p>
        {healthError ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            Health check failed: {healthError}
          </p>
        ) : null}
        <form action={saveBotToken} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs opacity-70">
            Bot token
            <input name="token" placeholder="123456789:AA…" className={inputCls} />
          </label>
          <button type="submit" className={primaryBtn}>
            Save token
          </button>
        </form>
      </section>

      {/* ── Webhook ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">2 · Webhook</h2>
        {webhook ? (
          <ul className="text-sm opacity-80">
            <li>
              URL: <span className="font-mono break-all">{webhook.url || "(none set)"}</span>
            </li>
            <li>Pending updates: {webhook.pending_update_count}</li>
            {webhook.last_error_message ? (
              <li className="text-red-600 dark:text-red-400">
                Last error: {webhook.last_error_message}
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-sm opacity-60">Save a valid token to see webhook status.</p>
        )}
        <form action={registerWebhook}>
          <button type="submit" className={secondaryBtn} disabled={!cfg.token}>
            Register / refresh webhook
          </button>
        </form>
        <p className="text-xs opacity-50">
          Telegram needs a public HTTPS URL — run this from the deployed site (uses
          <code> NEXT_PUBLIC_APP_URL</code>).
        </p>
      </section>

      {/* ── Group ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">3 · House group</h2>
        {cfg.groupConfirmed && cfg.groupChatId != null ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-80">
              Confirmed group: <span className="font-mono">{cfg.groupChatId}</span>
            </span>
            <form action={clearGroup}>
              <button type="submit" className={secondaryBtn}>
                Clear
              </button>
            </form>
          </div>
        ) : cfg.pendingGroupChatId != null ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="opacity-80">
              Detected group: <span className="font-mono">{cfg.pendingGroupChatId}</span>
            </span>
            <form action={confirmGroup}>
              <button type="submit" className={primaryBtn}>
                Confirm this group
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm opacity-60">
            Add the bot to your house group (or send <code>/start@yourbot</code> there). The chat id
            appears here to confirm.
          </p>
        )}
      </section>
    </main>
  );
}
