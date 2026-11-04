-- Production audit hardening: public visibility, tournament lifecycle guards,
-- and the server-side handoff of completed matches.

alter table public.tournaments
  alter column is_public set default false;

update public.tournaments
   set is_public = false
 where status = 'draft' and is_public;

create or replace function public.can_read_tournament(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.tournaments
     where id = t
       and (
         (is_public and status <> 'draft')
         or manages_tournament(t)
         or exists (
           select 1
             from public.tournament_referees r
            where r.tournament_id = t
              and r.profile_id = (select auth.uid())
         )
       )
  );
$$;

grant execute on function public.can_read_tournament(uuid) to anon, authenticated;

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
  loser_id uuid;
  next_match matches;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match) or manages_tournament(m.tournament_id)) then raise exception 'forbidden'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'in_progress' or s.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if (p_scorer is null) <> (p_finish is null) then raise exception 'invalid_draw'; end if;
  if p_scorer is not null and p_scorer not in (m.participant1_id, m.participant2_id) then raise exception 'invalid_scorer'; end if;
  select * into r from public.rounds where id = m.round_id;
  if p_finish is not null then
    select coalesce(points, 0) into pts
      from public.tournament_finish_points
     where tournament_id = m.tournament_id and finish = p_finish;
  end if;
  target_points := case
    when r.bracket::text = 'grand_final' or lower(coalesce(r.name, '')) = 'gran final' then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type::text = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;
  scorer_is_p1 := p_scorer = m.participant1_id;
  insert into public.battles (match_id, battle_number, set_number, scorer_id, finish, points, recorded_by)
  values (p_match, (select coalesce(max(battle_number), 0) + 1 from public.battles where match_id = p_match),
          m.sets1 + m.sets2 + 1, p_scorer, p_finish, pts, auth.uid());
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
        m.score1 := 0; m.score2 := 0;
      end if;
    end if;
  end if;
  m.status := case when m.status = 'completed' then 'completed' else 'in_progress' end;
  update public.matches set score1 = m.score1, score2 = m.score2, sets1 = m.sets1, sets2 = m.sets2,
    status = m.status, winner_id = m.winner_id, finished_at = m.finished_at,
    started_at = coalesce(started_at, now()), version = version + 1
    where id = p_match returning * into m;

  if m.status = 'completed' and m.winner_id is not null then
    loser_id := case when m.winner_id = m.participant1_id then m.participant2_id else m.participant1_id end;
    if m.next_match_winner_id is not null then
      update public.matches
         set participant1_id = case when participant1_id is null then m.winner_id else participant1_id end,
             participant2_id = case when participant1_id is not null and participant2_id is null then m.winner_id else participant2_id end,
             version = version + 1
       where id = m.next_match_winner_id;
    end if;
    if m.next_match_loser_id is not null and loser_id is not null then
      update public.matches
         set participant1_id = case when participant1_id is null then loser_id else participant1_id end,
             participant2_id = case when participant1_id is not null and participant2_id is null then loser_id else participant2_id end,
             version = version + 1
       where id = m.next_match_loser_id;
    end if;
  end if;

  update public.stages
     set status = 'completed'
   where id = m.stage_id
     and not exists (
       select 1 from public.matches
        where stage_id = m.stage_id
          and status <> 'completed'
     );

  update public.tournaments
     set status = 'completed'
   where id = m.tournament_id
     and not exists (
       select 1
         from public.stages
        where tournament_id = m.tournament_id
          and status <> 'completed'
     );

  return m;
end;
$$;

grant execute on function public.record_battle(uuid, uuid, finish_type, integer) to authenticated;
