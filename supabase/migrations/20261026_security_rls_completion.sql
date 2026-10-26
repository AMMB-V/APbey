-- Completa las políticas RLS del esquema inicial.
-- audit_log es la tabla canónica; audit_logs queda fuera de nuevas escrituras.

alter table tournament_finish_points enable row level security;
alter table tournament_referees enable row level security;
alter table participants enable row level security;
alter table stages enable row level security;
alter table groups enable row level security;
alter table group_participants enable row level security;
alter table rounds enable row level security;
alter table battles enable row level security;
alter table penalties enable row level security;
alter table audit_log enable row level security;

drop policy if exists tournament_finish_points_read on tournament_finish_points;
create policy tournament_finish_points_read on tournament_finish_points
  for select using (can_read_tournament(tournament_id));

drop policy if exists tournament_finish_points_manage on tournament_finish_points;
create policy tournament_finish_points_manage on tournament_finish_points
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists tournament_referees_read on tournament_referees;
create policy tournament_referees_read on tournament_referees
  for select using (can_read_tournament(tournament_id));

drop policy if exists tournament_referees_manage on tournament_referees;
create policy tournament_referees_manage on tournament_referees
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists participants_read on participants;
create policy participants_read on participants
  for select using (can_read_tournament(tournament_id));

drop policy if exists participants_manage on participants;
create policy participants_manage on participants
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists stages_read on stages;
create policy stages_read on stages
  for select using (can_read_tournament(tournament_id));

drop policy if exists stages_manage on stages;
create policy stages_manage on stages
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists groups_read on groups;
create policy groups_read on groups
  for select using (
    exists (
      select 1 from stages s
      where s.id = groups.stage_id and can_read_tournament(s.tournament_id)
    )
  );

drop policy if exists groups_manage on groups;
create policy groups_manage on groups
  for all using (
    exists (
      select 1 from stages s
      where s.id = groups.stage_id and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from stages s
      where s.id = groups.stage_id and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_read on group_participants;
create policy group_participants_read on group_participants
  for select using (
    exists (
      select 1
      from groups g
      join stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and can_read_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_manage on group_participants;
create policy group_participants_manage on group_participants
  for all using (
    exists (
      select 1
      from groups g
      join stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from groups g
      join stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_read on rounds;
create policy rounds_read on rounds
  for select using (
    exists (
      select 1 from stages s
      where s.id = rounds.stage_id and can_read_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_manage on rounds;
create policy rounds_manage on rounds
  for all using (
    exists (
      select 1 from stages s
      where s.id = rounds.stage_id and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from stages s
      where s.id = rounds.stage_id and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists battles_read on battles;
create policy battles_read on battles
  for select using (
    exists (
      select 1 from matches m
      where m.id = battles.match_id and can_read_tournament(m.tournament_id)
    )
  );

drop policy if exists battles_record on battles;
create policy battles_record on battles
  for insert with check (
    exists (
      select 1 from matches m
      where m.id = battles.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists penalties_read on penalties;
create policy penalties_read on penalties
  for select using (
    exists (
      select 1 from matches m
      where m.id = penalties.match_id and can_read_tournament(m.tournament_id)
    )
  );

drop policy if exists penalties_record on penalties;
create policy penalties_record on penalties
  for insert with check (
    exists (
      select 1 from matches m
      where m.id = penalties.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists audit_log_admin_read on audit_log;
create policy audit_log_admin_read on audit_log
  for select using (is_admin());

drop policy if exists audit_log_authenticated_insert on audit_log;
create policy audit_log_authenticated_insert on audit_log
  for insert with check (
    auth.uid() is not null and actor = auth.uid()
  );
