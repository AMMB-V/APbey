-- Avoid overlapping SELECT policies: public reads remain separate from
-- administrator mutations.
drop policy if exists ranking_entries_admin_write on public.ranking_entries;
drop policy if exists hall_of_fame_admin_write on public.hall_of_fame_entries;

drop policy if exists ranking_entries_admin_insert on public.ranking_entries;
create policy ranking_entries_admin_insert on public.ranking_entries
  for insert to authenticated
  with check (is_admin());

drop policy if exists ranking_entries_admin_update on public.ranking_entries;
create policy ranking_entries_admin_update on public.ranking_entries
  for update to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists ranking_entries_admin_delete on public.ranking_entries;
create policy ranking_entries_admin_delete on public.ranking_entries
  for delete to authenticated
  using (is_admin());

drop policy if exists hall_of_fame_admin_insert on public.hall_of_fame_entries;
create policy hall_of_fame_admin_insert on public.hall_of_fame_entries
  for insert to authenticated
  with check (is_admin());

drop policy if exists hall_of_fame_admin_update on public.hall_of_fame_entries;
create policy hall_of_fame_admin_update on public.hall_of_fame_entries
  for update to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists hall_of_fame_admin_delete on public.hall_of_fame_entries;
create policy hall_of_fame_admin_delete on public.hall_of_fame_entries
  for delete to authenticated
  using (is_admin());
