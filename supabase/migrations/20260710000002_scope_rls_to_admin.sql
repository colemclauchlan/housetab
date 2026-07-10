-- Scope RLS to the single admin, closing the "any authenticated user has full
-- access" hole. Supabase allows public signup with the (public) publishable key
-- by default; without this, a random signup would satisfy `to authenticated
-- using (true)` and read/write everything. Binding the policies to the admin's
-- email claim means only the admin's session has access — anyone else who signs
-- up gets nothing. The service role still bypasses RLS for the webhook/cron.
--
-- This also clears the `rls_policy_always_true` advisor warnings.
--
-- NOTE (single-tenant): the admin email is baked into the predicate. If the admin
-- email ever changes, update it here. The Telegram bot never uses these policies
-- (it runs as the service role), so roommates are unaffected.

-- Replace the permissive "admin full access" policies with email-scoped ones.
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
      || 'using ((auth.jwt() ->> ''email'') = %L) with check ((auth.jwt() ->> ''email'') = %L)',
      t, admin_email, admin_email
    );
  end loop;
end $$;
