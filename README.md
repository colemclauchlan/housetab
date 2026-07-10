# HouseTab

Household bill-splitting dashboard + Telegram group bot for a house of 6.

One roommate pays the landlord for rent and utilities; HouseTab lets him log each bill, then a
Telegram bot posts the monthly breakdown to the house group chat. Roommates mark themselves
paid with a one-tap **"✅ I've sent my e-transfer"** button, the message updates live with
⬜/✅ next to each name, and the dashboard shows who still owes.

## Status

✅ **PRD approved, rev 2** (Telegram Bot API instead of WhatsApp; even 6-way split) — ready
for the build agent to start on the execution plan. No production code yet.

- [PRD](docs/PRD.md) — what we're building and why
- [Execution plan](docs/EXECUTION_PLAN.md) — task-by-task build plan for the autonomous agent

## Planned stack

- **Everything on Vercel:** Next.js + TypeScript + Tailwind — dashboard *and* the bot
  (webhook route), no separate worker
- **Data/auth:** **Supabase** (Postgres, Auth)
- **Bot:** official **Telegram Bot API** via grammY — free, no phone number needed, created in
  2 minutes with @BotFather

Total hosting cost: **$0/month** (Vercel Hobby + Supabase Free + free Bot API).

Setup, env vars, and the full runbook will land here as the build progresses.
