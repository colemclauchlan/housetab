-- HouseTab initial schema (PRD §6) + RLS (PRD §5).
--
-- Access model:
--   * authenticated role (the single admin; no public signup) = full CRUD on everything.
--   * anon role = no access at all (no policies granted).
--   * the Telegram webhook + cron routes use the Supabase SERVICE ROLE key server-side,
--     which bypasses RLS entirely — so no anon/public policies are ever needed.

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type period_status as enum ('open', 'announced', 'closed');
create type share_status as enum ('pending', 'paid');
create type paid_via as enum ('button', 'reply', 'reaction', 'admin');

-- ─── members ─────────────────────────────────────────────────────────────────
-- The 6 housemates (including the admin). telegram_user_id is null until the
-- roommate links themselves via the bot's setup message (FR-22).
create table public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  telegram_user_id bigint unique, -- one Telegram user maps to at most one member
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── periods ─────────────────────────────────────────────────────────────────
-- Monthly billing periods anchored on a configurable day (default 15).
create table public.periods (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date date not null,
  end_date date not null,
  status period_status not null default 'open',
  announce_message_id bigint, -- Telegram message id of the announcement (null until announced)
  created_at timestamptz not null default now(),
  constraint periods_dates_ordered check (end_date > start_date)
);

-- ─── bills ───────────────────────────────────────────────────────────────────
-- Individual bills the admin logs against a period. amount_cents is integer cents
-- (CAD) to avoid floating-point money errors. type is a configurable string whose
-- allowed values live in settings.bill_types; label is an optional override (e.g.
-- for the "Other" type).
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  type text not null,
  label text,
  amount_cents integer not null check (amount_cents >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index bills_period_id_idx on public.bills (period_id);

-- ─── shares ──────────────────────────────────────────────────────────────────
-- Per-member amount owed for a period, frozen at Announce time (FR-6/FR-7). One
-- row per (period, member). status tracks payment; paid_via records how it was
-- marked.
create table public.shares (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.periods(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount_cents integer not null check (amount_cents >= 0),
  status share_status not null default 'pending',
  paid_at timestamptz,
  paid_via paid_via,
  created_at timestamptz not null default now(),
  unique (period_id, member_id)
);
create index shares_period_id_idx on public.shares (period_id);
create index shares_member_id_idx on public.shares (member_id);

-- ─── settings ────────────────────────────────────────────────────────────────
-- Key/value app config: anchor day, bill types, reminder schedule, group chat id,
-- last processed update_id, etc. jsonb value keeps it flexible.
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ─── events ──────────────────────────────────────────────────────────────────
-- Append-only log of inbound Telegram updates for debugging/audit. The unique
-- update_id gives natural idempotency: the webhook inserts on-conflict-do-nothing,
-- so Telegram's retries (which reuse update_id) are deduped for free.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  update_id bigint unique,
  type text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
create index events_created_at_idx on public.events (created_at);

-- ─── Row Level Security ──────────────────────────────────────────────────────
-- Enable RLS on every table and grant the authenticated (admin) role full access.
-- anon gets nothing; the service role bypasses RLS for the webhook/cron routes.
alter table public.members enable row level security;
alter table public.periods enable row level security;
alter table public.bills enable row level security;
alter table public.shares enable row level security;
alter table public.settings enable row level security;
alter table public.events enable row level security;

create policy "admin full access" on public.members
  for all to authenticated using (true) with check (true);
create policy "admin full access" on public.periods
  for all to authenticated using (true) with check (true);
create policy "admin full access" on public.bills
  for all to authenticated using (true) with check (true);
create policy "admin full access" on public.shares
  for all to authenticated using (true) with check (true);
create policy "admin full access" on public.settings
  for all to authenticated using (true) with check (true);
create policy "admin full access" on public.events
  for all to authenticated using (true) with check (true);

-- ─── Seed config defaults ────────────────────────────────────────────────────
insert into public.settings (key, value) values
  ('anchor_day', '15'::jsonb),
  ('bill_types', '["Rent", "Hydro", "Electricity", "Gas", "Internet"]'::jsonb),
  ('reminders', '{"enabled": true, "first_days": [3, 7], "then_every_days": 3}'::jsonb),
  ('group_chat_id', 'null'::jsonb),
  ('pending_group_chat_id', 'null'::jsonb),
  ('group_confirmed', 'false'::jsonb);
