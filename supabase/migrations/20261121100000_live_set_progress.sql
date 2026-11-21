alter table public.matches add column set_checkpoint jsonb;

create function apbey_private.advance_scored_match(m public.matches, source_bracket text) returns void language plpgsql set search_path = '' as $$
declare
  next_id uuid;
  advancing_id uuid;
  winner_path boolean;
  preferred_slot int;
  next_round public.rounds;
begin
  -- The existing progression trigger manages grand finals and reset matches.
  for next_id, advancing_id, winner_path in
    select m.next_match_winner_id, m.winner_id, true
    union all select m.next_match_loser_id, case when m.winner_id=m.participant1_id then m.participant2_id else m.participant1_id end, false
  loop
    if next_id is null then continue; end if;
    select round.* into next_round
      from public.matches as next_match
      join public.rounds as round on round.id = next_match.round_id
     where next_match.id = next_id;
    if winner_path and next_round.bracket = 'grand_final' then continue; end if;
    preferred_slot := (m.position - 1) % 2;
    if not winner_path and source_bracket = 'winners' and next_round.bracket = 'losers'
       and not exists (select 1 from public.rounds where stage_id = m.stage_id
                       and bracket = 'losers' and number > next_round.number) then
      preferred_slot := 1;
    end if;

    update public.matches as next_match
       set participant1_id = case when next_match.participant1_id is null
                                    and (preferred_slot = 0 or next_match.participant2_id is not null)
                                  then advancing_id else next_match.participant1_id end,
           participant2_id = case when next_match.participant2_id is null
                                    and (preferred_slot = 1 or next_match.participant1_id is not null)
                                  then advancing_id else next_match.participant2_id end,
           version = next_match.version + 1
     where next_match.id = next_id and next_match.status = 'pending'
       and advancing_id is distinct from next_match.participant1_id
       and advancing_id is distinct from next_match.participant2_id
       and (next_match.participant1_id is null or next_match.participant2_id is null);
  end loop;

  -- Serialize completion checks for simultaneous reports on different matches.
  perform 1 from public.tournaments where id = m.tournament_id for no key update;
  update public.stages set status = 'completed'
   where id = m.stage_id
     and not exists (select 1 from public.matches where stage_id = m.stage_id and status <> 'completed');
  update public.tournaments set status = 'completed'
   where id = m.tournament_id and status = 'in_progress'
     and not exists (select 1 from public.stages where tournament_id = m.tournament_id and status <> 'completed');

end;
$$;
revoke all on function apbey_private.advance_scored_match(public.matches,text) from public,anon,authenticated;

create or replace function apbey_private.write_match_sets(
  p_match_id uuid,
  p_expected_version int,
  p_scores jsonb,
  p_partial boolean
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  r public.rounds;
  before_report jsonb;
  set_score jsonb;
  row_number int := 0;
  v_score1 int;
  v_score2 int;
  target_points int;
  sets_needed int;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner_id uuid;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (public.referees_match(m.id) or public.manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if p_partial and m.status = 'in_progress' and m.version - 1 = p_expected_version
     and (m.set_checkpoint->>'version')::int = m.version and m.set_checkpoint->'scores' = p_scores then return m; end if;
  if not p_partial and m.status = 'completed' and m.version - 1 = p_expected_version and m.manual_set_scores = p_scores then
    return m;
  end if;
  if m.version is distinct from p_expected_version then raise exception 'version_conflict'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.is_bye or m.participant1_id is null or m.participant2_id is null then
    raise exception 'match_not_ready';
  end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  select * into r from public.rounds where id = m.round_id;
  if s.status <> 'in_progress' or t.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;

  if jsonb_typeof(p_scores) is distinct from 'array' then raise exception 'invalid_set_scores'; end if;
  if jsonb_array_length(p_scores) = 0 then raise exception 'invalid_set_count'; end if;
  sets_needed := s.best_of / 2 + 1;
  target_points := case
    when r.bracket = 'grand_final' or lower(trim(r.name)) = 'gran final' then t.points_to_win_final
    when s.type in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  for set_score in select value from jsonb_array_elements(p_scores) loop
    if v_sets1 = sets_needed or v_sets2 = sets_needed then raise exception 'sets_after_decision'; end if;
    if jsonb_typeof(set_score) <> 'array' then raise exception 'invalid_set_scores'; end if;
    if jsonb_array_length(set_score) <> 2
       or jsonb_typeof(set_score -> 0) is distinct from 'number'
       or jsonb_typeof(set_score -> 1) is distinct from 'number'
       or (set_score ->> 0) !~ '^[0-9]{1,10}$'
       or (set_score ->> 1) !~ '^[0-9]{1,10}$'
       or (set_score ->> 0)::bigint > 2147483647
       or (set_score ->> 1)::bigint > 2147483647 then
      raise exception 'invalid_set_scores';
    end if;
    v_score1 := (set_score ->> 0)::int;
    v_score2 := (set_score ->> 1)::int;
    row_number := row_number + 1;
    if p_partial and row_number = jsonb_array_length(p_scores) then
      if greatest(v_score1, v_score2) >= target_points then raise exception 'unfinished_set'; end if;
      exit;
    end if;
    if v_score1 = v_score2 then continue; end if;
    if (v_score1 >= target_points) = (v_score2 >= target_points) then raise exception 'unfinished_set'; end if;
    if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
  end loop;
  if p_partial then
    before_report := to_jsonb(m);
    update public.matches set score1 = v_score1, score2 = v_score2, sets1 = v_sets1, sets2 = v_sets2,
      set_checkpoint = jsonb_build_object('scores', p_scores, 'version', m.version+1,
        'battleNumber', (select coalesce(max(battle_number),0) from public.battles where match_id = m.id),
        'penaltyIds', (select coalesce(jsonb_agg(id), '[]'::jsonb) from public.penalties where match_id = m.id)),
      status = 'in_progress', started_at = coalesce(started_at, now()), version = version + 1
    where id = m.id returning * into m;
    insert into public.audit_log(table_name,record_id,action,old_data,new_data,actor)
      values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());
    return m;
  end if;
  if v_sets1 < sets_needed and v_sets2 < sets_needed then raise exception 'unfinished_match'; end if;

  before_report := to_jsonb(m);
  v_winner_id := case when v_sets1 = sets_needed then m.participant1_id else m.participant2_id end;

  update public.matches as match
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         manual_set_scores = p_scores,
         status = 'completed',
         winner_id = v_winner_id,
         is_draw = false,
         outcome = 'normal',
         started_at = coalesce(match.started_at, now()),
         finished_at = now(),
         version = match.version + 1
   where match.id = m.id returning match.* into m;

  perform apbey_private.advance_scored_match(m,r.bracket);

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor)
  values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());

  return m;
end;
$$;

revoke all on function apbey_private.write_match_sets(uuid,int,jsonb,boolean) from public,anon;
grant execute on function apbey_private.write_match_sets(uuid,int,jsonb,boolean) to authenticated;

create or replace function apbey_private.report_match_sets(p_match_id uuid,p_expected_version int,p_scores jsonb)
returns public.matches language sql set search_path = '' as $$
  select * from apbey_private.write_match_sets(p_match_id,p_expected_version,p_scores,false);
$$;

create function public.save_match_set_progress(p_match_id uuid,p_expected_version int,p_scores jsonb)
returns public.matches language sql set search_path = '' as $$
  select * from apbey_private.write_match_sets(p_match_id,p_expected_version,p_scores,true);
$$;
revoke all on function public.save_match_set_progress(uuid,int,jsonb) from public,anon;
grant execute on function public.save_match_set_progress(uuid,int,jsonb) to authenticated;

create function apbey_private.guard_set_checkpoint() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.set_checkpoint is not null then
    if new.reopened_at is distinct from old.reopened_at and new.status = 'pending' then
      new.set_checkpoint := null;
    elsif new.version < old.version or (new.version = old.version and
      row(new.score1,new.score2,new.sets1,new.sets2,new.status,new.set_checkpoint)
      is distinct from row(old.score1,old.score2,old.sets1,old.sets2,old.status,old.set_checkpoint)) then
      raise exception 'version_conflict';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_set_checkpoint before update on public.matches for each row execute function apbey_private.guard_set_checkpoint();

create function apbey_private.number_live_set() returns trigger language plpgsql set search_path = '' as $$
begin
  select new.set_number + count(*) into new.set_number from public.matches m,
    lateral jsonb_array_elements(m.set_checkpoint->'scores') with ordinality a(score,idx)
    where m.id = new.match_id and idx < jsonb_array_length(m.set_checkpoint->'scores') and score->0 = score->1;
  return new;
end;
$$;
create trigger number_live_set before insert on public.battles for each row execute function apbey_private.number_live_set();
-- Transactional undo for the last non-voided battle of a match.
-- Rebuilds the score from the remaining battle and penalty events so the
-- operation remains correct when the undone battle completed a set or match.

create or replace function public.undo_last_battle(
  p_match_id uuid,
  p_expected_version int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  old_winner uuid;
  old_loser uuid;
  sets_needed int;
  target_points int;
  event record;
  v_score1 int := 0;
  v_score2 int := 0;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner uuid := null;
  next_status match_status := 'pending';
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status in ('cancelled', 'completed') then raise exception 'tournament_not_editable'; end if;
  if not exists (
    select 1 from public.battles
     where match_id = p_match_id and battle_number > coalesce((m.set_checkpoint->>'battleNumber')::int,0) and not voided
  ) then
    raise exception 'no_battle_to_undo';
  end if;

  update public.battles
     set voided = true
   where id = (
     select id
       from public.battles
      where match_id = p_match_id and battle_number > coalesce((m.set_checkpoint->>'battleNumber')::int,0) and not voided
      order by created_at desc, battle_number desc
      limit 1
   );

  old_winner := m.winner_id;
  old_loser := case
    when m.winner_id = m.participant1_id then m.participant2_id
    when m.winner_id = m.participant2_id then m.participant1_id
    else null
  end;
  sets_needed := floor(s.best_of / 2) + 1;
  target_points := case
    when exists (
      select 1 from public.rounds r
       where r.id = m.round_id
         and (r.bracket::text = 'grand_final' or lower(coalesce(r.name, '')) = 'gran final')
    ) then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type::text = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  if m.set_checkpoint is not null then
    v_score1 := (m.set_checkpoint->'scores'->-1->>0)::int;
    v_score2 := (m.set_checkpoint->'scores'->-1->>1)::int;
    select count(*) filter(where (score->>0)::int > (score->>1)::int),
           count(*) filter(where (score->>1)::int > (score->>0)::int)
      into v_sets1,v_sets2 from jsonb_array_elements(m.set_checkpoint->'scores') with ordinality a(score,idx)
      where idx < jsonb_array_length(m.set_checkpoint->'scores');
    next_status := 'in_progress';
  end if;
  for event in
    select 'battle' as kind, b.created_at, b.scorer_id as awarded_to, b.points
      from public.battles b
     where b.match_id = p_match_id and b.battle_number > coalesce((m.set_checkpoint->>'battleNumber')::int,0) and not b.voided and b.scorer_id is not null
    union all
    select 'penalty' as kind, p.created_at, p.awarded_to, p.points_awarded
      from public.penalties p
     where p.match_id = p_match_id and not coalesce((m.set_checkpoint->'penaltyIds') ? p.id::text,false) and p.awarded_to is not null and p.points_awarded > 0
    order by created_at
  loop
    if event.awarded_to = m.participant1_id then v_score1 := v_score1 + event.points; end if;
    if event.awarded_to = m.participant2_id then v_score2 := v_score2 + event.points; end if;
    if greatest(v_score1, v_score2) >= target_points then
      if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
      v_score1 := 0;
      v_score2 := 0;
      if v_sets1 >= sets_needed or v_sets2 >= sets_needed then
        v_winner := case when v_sets1 >= sets_needed then m.participant1_id else m.participant2_id end;
        exit;
      end if;
    end if;
  end loop;

  if v_winner is not null then
    next_status := 'completed';
  elsif v_score1 > 0 or v_score2 > 0 or v_sets1 > 0 or v_sets2 > 0 then
    next_status := 'in_progress';
  end if;

  if old_winner is not null and (v_winner is null or v_winner is distinct from old_winner) then
    perform 1 from public.matches where id in (m.next_match_winner_id, m.next_match_loser_id) for update;
    if exists (select 1 from public.matches where id in (m.next_match_winner_id, m.next_match_loser_id)
      and status <> 'pending' and (participant1_id in (old_winner,old_loser) or participant2_id in (old_winner,old_loser))) then
      raise exception 'downstream_match_started';
    end if;
    update public.matches
       set participant1_id = case when participant1_id in (old_winner, old_loser) then null else participant1_id end,
           participant2_id = case when participant2_id in (old_winner, old_loser) then null else participant2_id end,
           version = version + 1
     where id in (m.next_match_winner_id, m.next_match_loser_id)
       and (participant1_id in (old_winner, old_loser) or participant2_id in (old_winner, old_loser));
  end if;

  update public.matches
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         winner_id = v_winner,
         status = next_status,
         finished_at = case when next_status = 'completed' then finished_at else null end,
         version = version + 1
   where id = p_match_id
   returning * into m;

  if next_status <> 'completed' then
    update public.stages set status = 'in_progress'
     where id = m.stage_id and status = 'completed';
  end if;
  update public.tournaments set status = 'in_progress'
   where id = m.tournament_id and status = 'completed';

  insert into public.audit_log(table_name, record_id, action, old_data, new_data, actor)
  values ('battles', p_match_id, 'undo',
          jsonb_build_object('winner_id', old_winner, 'match_version', p_expected_version),
          jsonb_build_object('winner_id', v_winner, 'match_version', m.version),
          auth.uid());
  return m;
end;
$$;

revoke all on function public.undo_last_battle(uuid, int) from public, anon;
grant execute on function public.undo_last_battle(uuid, int) to authenticated;

create or replace function public.reopen_match(
  p_match_id uuid,
  p_expected_version int,
  p_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_actor_role text;
  v_previous jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reopen_reason_required';
  end if;

  select role into v_actor_role
    from public.profiles
   where id = auth.uid();
  if v_actor_role not in ('admin', 'organizer', 'referee') then
    raise exception 'FORBIDDEN';
  end if;

  select *
    into v_match
    from public.matches
   where id = p_match_id
   for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;
  if v_match.status <> 'completed' then
    raise exception 'match_not_completed';
  end if;
  if not coalesce(public.manages_tournament(v_match.tournament_id) or public.referees_match(v_match.id), false) then
    raise exception 'FORBIDDEN';
  end if;

  v_previous := to_jsonb(v_match);
  update public.matches
     set winner_id = null,
         is_draw = false,
         score1 = 0,
         score2 = 0,
         sets1 = 0,
         sets2 = 0,
         status = 'pending',
         outcome = null,
         outcome_note = null,
         reopened_at = now(),
         reopened_by = auth.uid(),
         reopen_reason = trim(p_reason),
         finished_at = null,
         version = version + 1
   where id = p_match_id
   returning * into v_match;

  insert into public.audit_log (
    table_name, record_id, action, old_data, new_data, actor
  )
  values (
    'matches', p_match_id, 'reopen', v_previous, to_jsonb(v_match), auth.uid()
  );

  return v_match;
end;
$$;

revoke all on function public.reopen_match(uuid, int, text) from public, anon;
grant execute on function public.reopen_match(uuid, int, text) to authenticated;

create or replace function public.record_penalty(
  p_match_id uuid,
  p_offender_id uuid,
  p_card card_type,
  p_is_foul boolean,
  p_points_awarded int,
  p_awarded_to uuid,
  p_reason text,
  p_issued_by uuid,
  p_expected_version int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  t tournaments;
  s stages;
  r rounds;
  rival_id uuid;
  fouls_count int := 0;
  awarded_points int := 0;
  target_points int;
  sets_needed int;
  new_penalty_id uuid;
begin
  if p_issued_by <> auth.uid() then raise exception 'issuer_mismatch'; end if;

  select * into m from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if p_offender_id not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_offender';
  end if;

  rival_id := case when p_offender_id = m.participant1_id
    then m.participant2_id else m.participant1_id end;

  select * into t from tournaments where id = m.tournament_id;
  select * into s from stages where id = m.stage_id;
  select * into r from rounds where id = m.round_id;

  if p_is_foul then
    select count(*) + 1
      into fouls_count
      from penalties
     where match_id = p_match_id
       and participant_id = p_offender_id
       and is_foul;

    if fouls_count % greatest(t.fouls_per_point, 1) = 0 then
      awarded_points := t.foul_points;
    end if;
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

  insert into penalties (
    match_id, participant_id, card, is_foul, points_awarded, awarded_to, reason, issued_by, created_at
  ) values (
    p_match_id, p_offender_id, p_card, p_is_foul, awarded_points,
    case when awarded_points > 0 then rival_id else null end,
    p_reason, auth.uid(), now()
  ) returning id into new_penalty_id;

  if awarded_points > 0 then
    if rival_id = m.participant1_id then m.score1 := m.score1 + awarded_points;
    else m.score2 := m.score2 + awarded_points;
    end if;

    if greatest(m.score1, m.score2) >= target_points then
      if rival_id = m.participant1_id then m.sets1 := m.sets1 + 1;
      else m.sets2 := m.sets2 + 1;
      end if;
      sets_needed := floor(s.best_of / 2) + 1;
      if m.sets1 >= sets_needed or m.sets2 >= sets_needed then
        m.status := 'completed';
        m.winner_id := case when m.sets1 >= sets_needed
          then m.participant1_id else m.participant2_id end;
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
  where id = p_match_id;

  if m.status = 'completed' then perform apbey_private.advance_scored_match(m,r.bracket); end if;

  return jsonb_build_object(
    'success', true,
    'penalty_id', new_penalty_id,
    'points_awarded', awarded_points,
    'awarded_to', case when awarded_points > 0 then rival_id else null end,
    'new_version', m.version + 1
  );
end;
$$;

revoke all on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
  to authenticated;
