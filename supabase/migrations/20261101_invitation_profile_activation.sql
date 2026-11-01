-- Create tournament profiles as soon as an invited Auth user is created.
-- The invitation code and display name are supplied as Auth user metadata by the app.
create or replace function public.handle_new_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations;
  profile_name text;
begin
  select *
    into invitation_row
    from public.invitations
   where status = 'pending'
     and lower(email) = lower(new.email)
     and upper(code) = upper(coalesce(new.raw_user_meta_data ->> 'invitation_code', ''))
   order by created_at asc
   limit 1
   for update;

  if found then
    profile_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
    if length(profile_name) < 2 then
      profile_name := 'Usuario';
    end if;

    insert into public.profiles (id, display_name, role)
    values (new.id, profile_name, invitation_row.role)
    on conflict (id) do update
      set display_name = excluded.display_name,
          role = excluded.role;

    update public.invitations
       set status = 'accepted'
     where id = invitation_row.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_invitation_profile on auth.users;
create trigger on_auth_user_created_invitation_profile
  after insert on auth.users
  for each row execute function public.handle_new_invited_user();

revoke all on function public.handle_new_invited_user() from public, anon, authenticated;

-- Draws are valid arbitration events and must not turn either score into NULL.
create or replace function public.record_battle(
  p_match uuid,
  p_scorer uuid,
  p_finish finish_type,
  p_expected_version int
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  s stages;
  t tournaments;
  r rounds;
  pts int := 0;
  need int;
  target_points int;
  scorer_is_p1 boolean;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match) or manages_tournament(m.tournament_id)) then raise exception 'forbidden'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if (p_scorer is null) <> (p_finish is null) then raise exception 'invalid_draw'; end if;
  if p_scorer is not null and p_scorer not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_scorer';
  end if;

  select * into s from stages where id = m.stage_id;
  select * into t from tournaments where id = m.tournament_id;
  select * into r from rounds where id = m.round_id;

  if p_finish is not null then
    select coalesce(points, 0) into pts
      from tournament_finish_points
     where tournament_id = m.tournament_id
       and finish = p_finish;
  end if;

  target_points := case
    when lower(coalesce(r.name, '')) = 'gran final' or r.bracket::text = 'grand_final'
      then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination')
      then t.points_to_win_playoffs
    when s.type::text = 'group_stage'
      then t.points_to_win_group
    else s.points_to_win
  end;

  scorer_is_p1 := p_scorer = m.participant1_id;

  insert into battles (match_id, battle_number, set_number, scorer_id, finish, points, recorded_by)
  values (
    p_match,
    (select coalesce(max(battle_number), 0) + 1 from battles where match_id = p_match),
    m.sets1 + m.sets2 + 1,
    p_scorer,
    p_finish,
    pts,
    auth.uid()
  );

  if p_scorer is not null then
    if scorer_is_p1 then m.score1 := m.score1 + pts; else m.score2 := m.score2 + pts; end if;
    if greatest(m.score1, m.score2) >= target_points then
      if scorer_is_p1 then m.sets1 := m.sets1 + 1; else m.sets2 := m.sets2 + 1; end if;
      need := floor(s.best_of / 2) + 1;
      if m.sets1 >= need or m.sets2 >= need then
        m.status := 'completed';
        m.winner_id := case when m.sets1 >= need then m.participant1_id else m.participant2_id end;
        m.finished_at := now();
      else
        m.score1 := 0;
        m.score2 := 0;
      end if;
    end if;
  end if;

  m.status := case when m.status = 'completed' then 'completed' else 'in_progress' end;
  update matches set
    score1 = m.score1,
    score2 = m.score2,
    sets1 = m.sets1,
    sets2 = m.sets2,
    status = m.status,
    winner_id = m.winner_id,
    finished_at = m.finished_at,
    started_at = coalesce(started_at, now()),
    version = version + 1
  where id = p_match
  returning * into m;

  return m;
end;
$$;

revoke all on function public.record_battle(uuid, uuid, finish_type, integer) from public, anon, authenticated;
grant execute on function public.record_battle(uuid, uuid, finish_type, integer) to authenticated;

