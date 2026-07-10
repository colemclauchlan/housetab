# HouseTab

Household bill-splitting dashboard + WhatsApp group bot for a house of 6.

One roommate pays the landlord for rent and utilities; HouseTab lets him log each bill, then a
WhatsApp bot posts the monthly breakdown to the house group chat. Roommates mark themselves
paid by replying, reacting ✅, or tapping a personal link — and the dashboard shows who still
owes.

## Status

📋 **Planning** — PRD drafted, awaiting sign-off. No production code yet.

- [PRD](docs/PRD.md) — what we're building and why
- [Execution plan](docs/EXECUTION_PLAN.md) — task-by-task build plan for the autonomous agent

## Planned stack

- **Web dashboard:** Next.js + TypeScript + Tailwind on **Vercel**
- **Data/auth:** **Supabase** (Postgres, Auth, Realtime)
- **WhatsApp bot:** Baileys worker (always-on Node process) on **Fly.io**/Railway

Setup, env vars, and deploy instructions will land here as the build progresses.
