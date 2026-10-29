-- Keep read access and mutation access as separate, non-overlapping policies.
-- This preserves the existing tournament-scoped authorization rules while
-- avoiding duplicate policy evaluation for authenticated SELECT queries.

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or is_admin());

drop policy if exists matches_manage on public.matches;
create policy matches_insert on public.matches
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy matches_update on public.matches
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy matches_delete on public.matches
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists tournament_finish_points_manage on public.tournament_finish_points;
create policy tournament_finish_points_insert on public.tournament_finish_points
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy tournament_finish_points_update on public.tournament_finish_points
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy tournament_finish_points_delete on public.tournament_finish_points
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists tournament_referees_manage on public.tournament_referees;
create policy tournament_referees_insert on public.tournament_referees
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy tournament_referees_update on public.tournament_referees
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy tournament_referees_delete on public.tournament_referees
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists participants_manage on public.participants;
create policy participants_insert on public.participants
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy participants_update on public.participants
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy participants_delete on public.participants
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists stages_manage on public.stages;
create policy stages_insert on public.stages
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy stages_update on public.stages
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy stages_delete on public.stages
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists groups_manage on public.groups;
create policy groups_insert on public.groups
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy groups_update on public.groups
  for update to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy groups_delete on public.groups
  for delete to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_manage on public.group_participants;
create policy group_participants_insert on public.group_participants
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy group_participants_update on public.group_participants
  for update to authenticated
  using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy group_participants_delete on public.group_participants
  for delete to authenticated
  using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_manage on public.rounds;
create policy rounds_insert on public.rounds
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy rounds_update on public.rounds
  for update to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy rounds_delete on public.rounds
  for delete to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
