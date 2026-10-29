-- Security hardening based on the live Supabase advisor audit.
-- This migration is idempotent and preserves existing tournament data.

alter table public.tournament_finish_points enable row level security;
alter table public.tournament_referees enable row level security;
alter table public.participants enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.group_participants enable row level security;
alter table public.rounds enable row level security;
alter table public.battles enable row level security;
alter table public.penalties enable row level security;
alter table public.audit_log enable row level security;

-- Some existing projects were initialized without this helper function.
-- Define it before policies that use it so this migration is self-contained.
create or replace function public.referees_match(m uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches
    where id = m
      and referee_id = (select auth.uid())
  );
$$;

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_admin_read on public.profiles
  for select to authenticated using (is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists tournaments_read on public.tournaments;
create policy tournaments_read on public.tournaments
  for select to anon, authenticated using (can_read_tournament(id));
drop policy if exists tournaments_insert on public.tournaments;
create policy tournaments_insert on public.tournaments
  for insert to authenticated
  with check (is_organizer() and organizer_id = (select auth.uid()));
drop policy if exists tournaments_update on public.tournaments;
create policy tournaments_update on public.tournaments
  for update to authenticated using (manages_tournament(id))
  with check (manages_tournament(id));
drop policy if exists tournaments_delete on public.tournaments;
create policy tournaments_delete on public.tournaments
  for delete to authenticated using (manages_tournament(id));

drop policy if exists matches_read on public.matches;
drop policy if exists matches_manage on public.matches;
create policy matches_read on public.matches
  for select to anon, authenticated using (can_read_tournament(tournament_id));
create policy matches_manage on public.matches
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists tournament_finish_points_read on public.tournament_finish_points;
create policy tournament_finish_points_read on public.tournament_finish_points
  for select to anon, authenticated using (can_read_tournament(tournament_id));
drop policy if exists tournament_finish_points_manage on public.tournament_finish_points;
create policy tournament_finish_points_manage on public.tournament_finish_points
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists tournament_referees_read on public.tournament_referees;
create policy tournament_referees_read on public.tournament_referees
  for select to anon, authenticated using (can_read_tournament(tournament_id));
drop policy if exists tournament_referees_manage on public.tournament_referees;
create policy tournament_referees_manage on public.tournament_referees
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists participants_read on public.participants;
drop policy if exists participants_write on public.participants;
drop policy if exists participants_manage on public.participants;
create policy participants_read on public.participants
  for select to anon, authenticated using (can_read_tournament(tournament_id));
create policy participants_manage on public.participants
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists stages_read on public.stages;
drop policy if exists stages_write on public.stages;
drop policy if exists stages_manage on public.stages;
create policy stages_read on public.stages
  for select to anon, authenticated using (can_read_tournament(tournament_id));
create policy stages_manage on public.stages
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists groups_read on public.groups;
drop policy if exists groups_manage on public.groups;
create policy groups_read on public.groups
  for select to anon, authenticated using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and can_read_tournament(s.tournament_id)
    )
  );
create policy groups_manage on public.groups
  for all to authenticated using (
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

drop policy if exists group_participants_read on public.group_participants;
drop policy if exists group_participants_manage on public.group_participants;
create policy group_participants_read on public.group_participants
  for select to anon, authenticated using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and can_read_tournament(s.tournament_id)
    )
  );
create policy group_participants_manage on public.group_participants
  for all to authenticated using (
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

drop policy if exists rounds_read on public.rounds;
drop policy if exists rounds_manage on public.rounds;
create policy rounds_read on public.rounds
  for select to anon, authenticated using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and can_read_tournament(s.tournament_id)
    )
  );
create policy rounds_manage on public.rounds
  for all to authenticated using (
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

drop policy if exists battles_read on public.battles;
drop policy if exists battles_record on public.battles;
create policy battles_read on public.battles
  for select to anon, authenticated using (
    exists (
      select 1
      from public.matches m
      where m.id = battles.match_id
        and can_read_tournament(m.tournament_id)
    )
  );
create policy battles_record on public.battles
  for insert to authenticated with check (
    exists (
      select 1
      from public.matches m
      where m.id = battles.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists penalties_read on public.penalties;
drop policy if exists penalties_record on public.penalties;
create policy penalties_read on public.penalties
  for select to anon, authenticated using (
    exists (
      select 1
      from public.matches m
      where m.id = penalties.match_id
        and can_read_tournament(m.tournament_id)
    )
  );
create policy penalties_record on public.penalties
  for insert to authenticated with check (
    exists (
      select 1
      from public.matches m
      where m.id = penalties.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists audit_log_admin_read on public.audit_log;
drop policy if exists audit_log_authenticated_insert on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (is_admin());
create policy audit_log_authenticated_insert on public.audit_log
  for insert to authenticated with check (
    (select auth.uid()) is not null
    and actor = (select auth.uid())
  );

-- Consolidate invitation UPDATE policies to avoid permissive-policy overlap.
drop policy if exists invitations_admin_update on public.invitations;
drop policy if exists invitations_claim_update on public.invitations;
drop policy if exists "Invitaciones canje propio" on public.invitations;
create policy invitations_update on public.invitations
  for update to authenticated
  using (
    is_admin()
    or (
      (select auth.uid()) is not null
      and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  )
  with check (
    is_admin() or status in ('accepted', 'revoked')
  );

-- Keep public tournament reads possible through the table policies, but prevent
-- direct RPC probing of internal authorization helpers and mutating functions.
revoke all on function can_read_tournament(uuid) from public, anon, authenticated;
revoke all on function is_admin() from anon, authenticated;
revoke all on function is_organizer() from anon, authenticated;
revoke all on function manages_tournament(uuid) from anon, authenticated;
revoke all on function referees_match(uuid) from anon, authenticated;
revoke all on function record_battle(uuid, uuid, finish_type, integer) from anon, authenticated;
revoke all on function record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer) from anon, authenticated;
revoke all on function seed_finish_points() from anon, authenticated;

grant execute on function record_battle(uuid, uuid, finish_type, integer) to authenticated;
grant execute on function record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer) to authenticated;
grant execute on function seed_finish_points() to authenticated;

-- Cover foreign keys identified by the performance advisor.
create index if not exists battles_recorded_by_idx on public.battles (recorded_by);
create index if not exists battles_scorer_id_idx on public.battles (scorer_id);
create index if not exists group_participants_participant_id_idx on public.group_participants (participant_id);
create index if not exists groups_referee_id_idx on public.groups (referee_id);
create index if not exists groups_stage_id_idx on public.groups (stage_id);
create index if not exists matches_group_id_idx on public.matches (group_id);
create index if not exists matches_next_match_loser_id_idx on public.matches (next_match_loser_id);
create index if not exists matches_next_match_winner_id_idx on public.matches (next_match_winner_id);
create index if not exists matches_participant1_id_idx on public.matches (participant1_id);
create index if not exists matches_participant2_id_idx on public.matches (participant2_id);
create index if not exists matches_round_id_idx on public.matches (round_id);
create index if not exists matches_tournament_id_idx on public.matches (tournament_id);
create index if not exists matches_winner_id_idx on public.matches (winner_id);
create index if not exists participants_profile_id_idx on public.participants (profile_id);
create index if not exists penalties_awarded_to_idx on public.penalties (awarded_to);
create index if not exists penalties_battle_id_idx on public.penalties (battle_id);
create index if not exists penalties_issued_by_idx on public.penalties (issued_by);
create index if not exists penalties_match_id_idx on public.penalties (match_id);
create index if not exists penalties_participant_id_idx on public.penalties (participant_id);
create index if not exists rounds_group_id_idx on public.rounds (group_id);
create index if not exists rounds_stage_id_idx on public.rounds (stage_id);
create index if not exists tournament_referees_profile_id_idx on public.tournament_referees (profile_id);
create index if not exists tournaments_organizer_id_idx on public.tournaments (organizer_id);
