# HouseTab

Household bill-splitting dashboard + Telegram group bot for a house of 6.

One roommate (the **admin**) pays the landlord for rent + utilities. HouseTab lets him log each
bill, then a Telegram bot posts the monthly breakdown to the house group chat. Roommates mark
themselves paid with a one-tap **"✅ I've sent my e-transfer"** button; the message updates live
with ⬜/✅ next to each name, and the dashboard shows who still owes. It never moves money — it
only tracks declarations of payment.

- Cost: **$0–$10/month** (Vercel Hobby + Supabase + free Telegram Bot API).
- [Acceptance checklist](docs/ACCEPTANCE.md)

**Why Telegram-first?** The house group chat already lives there. Bills arrive as a formatted
message with one-tap paid buttons — nobody installs an app, and the admin dashboard stays a
private, no-signup surface for the one person who actually pays the landlord.

## Stack

- **Next.js 15** (App Router, TypeScript, Tailwind v4) — dashboard **and** the bot webhook, one app
- **Supabase** (Postgres + Auth, RLS)
- **Telegram Bot API** via a thin native client (webhook mode) — no phone number, group-native
- **Vercel** hosting + **Vercel Cron** (daily reminders)

## Local development

```bash
pnpm install
cp .env.example .env.local   # then fill in the values (see below)
pnpm dev                     # http://localhost:3000
```

Scripts: `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm format`.

### Database

Schema lives in `supabase/migrations/`. Apply them to your Supabase project (via the Supabase
CLI `supabase db push`, the dashboard SQL editor, or the MCP tools). Then regenerate types into
`lib/database.types.ts` if you change the schema.

## Environment variables

| Var | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Publishable/anon key (public; RLS enforces access) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Secret. Used by the webhook + cron routes to bypass RLS |
| `TELEGRAM_BOT_TOKEN` | server | From @BotFather. Can also be pasted on the Settings page (stored in the DB) for the single-tenant MVP |
| `TELEGRAM_WEBHOOK_SECRET` | server | Random string; validates Telegram's `X-Telegram-Bot-Api-Secret-Token`. If unset, the app generates + stores one |
| `NEXT_PUBLIC_APP_URL` | server | Public base URL (used to register the webhook) |
| `CRON_SECRET` | server | Bearer token protecting `/api/cron/reminders` (Vercel sends it automatically) |

Never commit real secrets — `.env.local` is gitignored; `.env.example` documents the keys.

## Setup runbook (going live)

1. **Create the bot.** In Telegram, message **@BotFather**: `/newbot`, pick a name + username,
   copy the token. Then run **`/setprivacy` → Disable** for the bot so it can see group replies
   (needed for the reply fallback).
2. **Deploy to Vercel.** Import this repo into Vercel and set the env vars above (at minimum the
   two `NEXT_PUBLIC_SUPABASE_*`; add the service-role key, `TELEGRAM_*`, and `CRON_SECRET` for
   full function). Deploy → note the production URL and set it as `NEXT_PUBLIC_APP_URL`.
3. **Log in** to the deployed dashboard as the admin (credentials provided out-of-band; change the
   password after first sign-in).
4. **Settings page → Bot token:** paste the BotFather token → **Register webhook** (needs the
   deployed HTTPS URL). The health line should show the bot's `@username`.
5. **Add the bot to your house group** (or send `/start@yourbot` there). Its chat id appears on
   the Settings page → **Confirm this group**.
6. **Add members** on the dashboard (names; mark one as the admin). Click **Post name buttons to
   group** → each roommate taps their own name once to link (permanent, first-come).
7. **Enter bills** as you pay them, then **📣 Announce** — the group gets the formatted breakdown
   with the "✅ I've sent my e-transfer" button.
8. **Roommates tap the button** (or reply "paid"/react 👍) after sending their e-transfer. The
   message + dashboard update live. **⏰ Remind unpaid** nudges stragglers; auto-reminders run
   daily (3 & 7 days after announcing, then every 3). When the last person pays, the bot posts
   🎉 and closes the period.

## Deploy notes

- **Vercel Hobby** cron runs once/day — `vercel.json` schedules `/api/cron/reminders` at 14:00 UTC.
- The webhook + cron are `nodejs` runtime routes; they use the Supabase **service-role** key and
  are excluded from the auth middleware (they guard themselves with their own secrets).

## Rotating the bot token

If the token leaks: in @BotFather run `/revoke` (issues a new token, invalidates the old one),
then paste the new token on the Settings page and click **Register webhook** again.

## Security

- RLS on every table, scoped to the admin's email claim; anon has no access; the service role
  (server-side only) bypasses RLS for the bot/cron.
- The webhook validates Telegram's secret-token header and dedupes by `update_id`.
- No public signup. Recommended dashboard hardening: disable Auth signups and enable leaked-
  password protection in the Supabase dashboard.
