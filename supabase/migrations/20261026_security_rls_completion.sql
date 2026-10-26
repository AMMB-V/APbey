-- Completa las políticas RLS del esquema inicial.
-- audit_log es la tabla canónica de auditoría.

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

-- Canjea una invitación después de crear la cuenta con Supabase Auth.
-- La operación bloquea la invitación para evitar doble uso concurrente.
create or replace function claim_invitation(
  p_code text,
  p_display_name text,
  p_email text
)
returns table (role user_role, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row invitations;
  authenticated_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if length(trim(p_display_name)) < 2 or length(trim(p_display_name)) > 100 then
    raise exception 'invalid_display_name';
  end if;

  if lower(trim(p_email)) <> authenticated_email then
    raise exception 'email_mismatch';
  end if;

  select *
    into invitation_row
    from invitations
   where upper(code) = upper(trim(p_code))
     and lower(email) = authenticated_email
     and status = 'pending'
   for update;

  if not found then
    raise exception 'invitation_invalid_or_used';
  end if;

  update invitations
     set status = 'accepted'
   where id = invitation_row.id;

  insert into profiles (id, display_name, role)
  values (auth.uid(), trim(p_display_name), invitation_row.role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role;

  return query select invitation_row.role, trim(p_display_name);
end;
$$;

revoke all on function claim_invitation(text, text, text) from public;
grant execute on function claim_invitation(text, text, text) to authenticated;
