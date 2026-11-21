create or replace function apbey_private.report_match_sets(
  p_match_id uuid,
  p_expected_version int,
  p_scores jsonb
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
  v_score1 int;
  v_score2 int;
  target_points int;
  sets_needed int;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner_id uuid;
  v_loser_id uuid;
  next_id uuid;
  advancing_id uuid;
  winner_path boolean;
  preferred_slot int;
  next_round public.rounds;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (public.referees_match(m.id) or public.manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.status = 'completed' and m.version - 1 = p_expected_version and m.manual_set_scores = p_scores then
    return m;
  end if;
  if m.version is distinct from p_expected_version then raise exception 'version_conflict'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.is_bye or m.participant1_id is null or m.participant2_id is null then
    raise exception 'match_not_ready';
  end if;
  if exists (select 1 from public.battles b where b.match_id = m.id and not b.voided)
     or exists (select 1 from public.penalties p where p.match_id = m.id) then
    raise exception 'match_has_live_events';
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
    if v_score1 = v_score2 then continue; end if;
    if (v_score1 >= target_points) = (v_score2 >= target_points) then raise exception 'unfinished_set'; end if;
    if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
  end loop;
  if v_sets1 < sets_needed and v_sets2 < sets_needed then raise exception 'unfinished_match'; end if;

  before_report := to_jsonb(m);
  v_winner_id := case when v_sets1 = sets_needed then m.participant1_id else m.participant2_id end;
  v_loser_id := case when v_sets1 = sets_needed then m.participant2_id else m.participant1_id end;

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

  -- The existing progression trigger manages grand finals and reset matches.
  for next_id, advancing_id, winner_path in
    select m.next_match_winner_id, v_winner_id, true
    union all select m.next_match_loser_id, v_loser_id, false
  loop
    if next_id is null then continue; end if;
    select round.* into next_round
      from public.matches as next_match
      join public.rounds as round on round.id = next_match.round_id
     where next_match.id = next_id;
    if winner_path and next_round.bracket = 'grand_final' then continue; end if;
    preferred_slot := (m.position - 1) % 2;
    if not winner_path and r.bracket = 'winners' and next_round.bracket = 'losers'
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

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor)
  values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());

  return m;
end;
$$;
