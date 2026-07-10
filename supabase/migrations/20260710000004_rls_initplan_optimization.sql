-- Perf: wrap auth.jwt() in a scalar subquery so Postgres evaluates it ONCE per
-- query instead of per row (Supabase advisor lint 0003, auth_rls_initplan).
-- Same access rule as before — the admin's email claim.
do $$
declare
  t text;
  admin_email constant text := 'coletmclauchlan@gmail.com';
begin
  foreach t in array array['members', 'periods', 'bills', 'shares', 'settings', 'events']
  loop
    execute format('drop policy if exists "admin full access" on public.%I', t);
    execute format(
      'create policy "admin full access" on public.%I for all to authenticated '
      || 'using (((select auth.jwt()) ->> ''email'') = %L) '
      || 'with check (((select auth.jwt()) ->> ''email'') = %L)',
      t, admin_email, admin_email
    );
  end loop;
end $$;
