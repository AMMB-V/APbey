-- Cache identity and role helper calls once per statement instead of once per
-- invitation row. The authorization rules themselves remain unchanged.
drop policy if exists invitations_admin_insert on public.invitations;
create policy invitations_admin_insert
  on public.invitations
  for insert
  with check (
    (select public.is_admin())
    and invited_by = (select auth.uid())::text
  );

drop policy if exists invitations_admin_read on public.invitations;
create policy invitations_admin_read
  on public.invitations
  for select
  using ((select public.is_admin()));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update
  on public.invitations
  for update
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select auth.uid()) is not null
      and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  )
  with check (
    (select public.is_admin())
    or status = any (array['accepted'::text, 'revoked'::text])
  );
