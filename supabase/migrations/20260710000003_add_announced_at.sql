-- Track when a period was announced, so the reminder cadence (N days after the
-- announcement, FR-18) can be computed by the cron job.
alter table public.periods add column announced_at timestamptz;
