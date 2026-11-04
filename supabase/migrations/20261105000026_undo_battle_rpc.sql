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
     where match_id = p_match_id and not voided
  ) then
    raise exception 'no_battle_to_undo';
  end if;

  update public.battles
     set voided = true
   where id = (
     select id
       from public.battles
      where match_id = p_match_id and not voided
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

  for event in
    select 'battle' as kind, b.created_at, b.scorer_id as awarded_to, b.points
      from public.battles b
     where b.match_id = p_match_id and not b.voided and b.scorer_id is not null
    union all
    select 'penalty' as kind, p.created_at, p.awarded_to, p.points_awarded
      from public.penalties p
     where p.match_id = p_match_id and p.awarded_to is not null and p.points_awarded > 0
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
