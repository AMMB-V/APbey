-- Keep bracket advancement and lifecycle state consistent when a manual set
-- correction changes a completed match back to an open result.

create or replace function public.adjust_manual_set(
  p_match_id uuid,
  p_participant_id uuid,
  p_delta int,
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
  sets_needed int;
  previous_winner uuid;
  previous_loser uuid;
  previous_status match_status;
  next_loser uuid;
begin
  if p_delta not in (-1, 1) then
    raise exception 'invalid_set_delta';
  end if;

  select *
    into m
    from public.matches
   where id = p_match_id
   for update;
  if not found then
    raise exception 'match_not_found';
  end if;

  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;

  if m.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;

  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status in ('cancelled', 'completed') then
    raise exception 'tournament_not_editable';
  end if;
  if s.status = 'pending' or (m.status <> 'completed' and p_delta < 0) then
    raise exception 'invalid_set_adjustment';
  end if;
  if p_participant_id not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_participant';
  end if;
  if p_delta > 0 and m.status = 'completed' then
    raise exception 'match_closed';
  end if;

  previous_status := m.status;
  previous_winner := m.winner_id;
  previous_loser := case
    when m.winner_id = m.participant1_id then m.participant2_id
    when m.winner_id = m.participant2_id then m.participant1_id
    else null
  end;

  if p_participant_id = m.participant1_id then
    m.sets1 := greatest(0, m.sets1 + p_delta);
  else
    m.sets2 := greatest(0, m.sets2 + p_delta);
  end if;

  sets_needed := floor(s.best_of / 2) + 1;
  if m.sets1 >= sets_needed or m.sets2 >= sets_needed then
    m.status := 'completed';
    m.winner_id := case
      when m.sets1 >= sets_needed then m.participant1_id
      else m.participant2_id
    end;
    m.finished_at := coalesce(m.finished_at, now());
  else
    m.status := case
      when m.sets1 > 0 or m.sets2 > 0 or m.score1 > 0 or m.score2 > 0
        then 'in_progress'::match_status
      else 'pending'::match_status
    end;
    m.winner_id := null;
    m.finished_at := null;
  end if;

  if previous_status = 'completed' and (
    m.status <> 'completed' or previous_winner is distinct from m.winner_id
  ) then
    update public.matches
       set participant1_id = case
             when participant1_id in (previous_winner, previous_loser) then null
             else participant1_id
           end,
           participant2_id = case
             when participant2_id in (previous_winner, previous_loser) then null
             else participant2_id
           end,
           version = version + 1
     where id in (m.next_match_winner_id, m.next_match_loser_id)
       and (
         participant1_id in (previous_winner, previous_loser)
         or participant2_id in (previous_winner, previous_loser)
       );
  end if;

  update public.matches
     set sets1 = m.sets1,
         sets2 = m.sets2,
         status = m.status,
         winner_id = m.winner_id,
         finished_at = m.finished_at,
         version = version + 1
   where id = p_match_id
   returning * into m;

  if m.status = 'completed' and m.winner_id is not null then
    next_loser := case
      when m.winner_id = m.participant1_id then m.participant2_id
      else m.participant1_id
    end;

    if m.next_match_winner_id is not null then
      update public.matches
         set participant1_id = case
               when participant1_id is null
                and participant2_id is distinct from m.winner_id
                 then m.winner_id
               else participant1_id
             end,
             participant2_id = case
               when participant1_id is not null
                and participant2_id is null
                and participant1_id is distinct from m.winner_id
                 then m.winner_id
               else participant2_id
             end,
             version = version + 1
       where id = m.next_match_winner_id
         and m.winner_id is distinct from participant1_id
         and m.winner_id is distinct from participant2_id;
    end if;

    if m.next_match_loser_id is not null and next_loser is not null then
      update public.matches
         set participant1_id = case
               when participant1_id is null
                and participant2_id is distinct from next_loser
                 then next_loser
               else participant1_id
             end,
             participant2_id = case
               when participant1_id is not null
                and participant2_id is null
                and participant1_id is distinct from next_loser
                 then next_loser
               else participant2_id
             end,
             version = version + 1
       where id = m.next_match_loser_id
         and next_loser is distinct from participant1_id
         and next_loser is distinct from participant2_id;
    end if;
  end if;

  if m.status <> 'completed' then
    update public.stages
       set status = 'in_progress'
     where id = m.stage_id
       and status = 'completed';
  end if;

  update public.stages
     set status = 'completed'
   where id = m.stage_id
     and not exists (
       select 1
         from public.matches
        where stage_id = m.stage_id
          and status <> 'completed'
     );

  update public.tournaments
     set status = 'in_progress'
   where id = m.tournament_id
     and status = 'completed';

  return m;
end;
$$;

revoke all on function public.adjust_manual_set(uuid, uuid, int, int) from public, anon;
grant execute on function public.adjust_manual_set(uuid, uuid, int, int) to authenticated;
