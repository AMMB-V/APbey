-- Persist the complete tournament snapshot in one database transaction.
-- The function remains SECURITY INVOKER so child upserts are still protected
-- by the existing tournament-scoped RLS policies.
create or replace function public.publish_tournament_snapshot(
  p_tournament jsonb,
  p_finish_points jsonb,
  p_referees jsonb,
  p_participants jsonb,
  p_stages jsonb,
  p_groups jsonb,
  p_group_participants jsonb,
  p_rounds jsonb,
  p_matches jsonb,
  p_battles jsonb,
  p_penalties jsonb
)
returns public.tournaments
language plpgsql
set search_path = public
as $$
declare
  v_result public.tournaments;
begin
  select * from public.publish_tournament(
    (p_tournament ->> 'id')::uuid,
    p_tournament ->> 'slug',
    p_tournament ->> 'name',
    p_tournament ->> 'description',
    (p_tournament ->> 'organizer_id')::uuid,
    (p_tournament ->> 'status')::tournament_status,
    (p_tournament ->> 'is_public')::boolean,
    (p_tournament ->> 'max_participants')::integer,
    (p_tournament ->> 'check_in_required')::boolean,
    (p_tournament ->> 'entry_fee')::numeric,
    (p_tournament ->> 'foul_points')::integer,
    (p_tournament ->> 'fouls_per_point')::integer,
    (p_tournament ->> 'points_to_win_group')::integer,
    (p_tournament ->> 'points_to_win_playoffs')::integer,
    (p_tournament ->> 'points_to_win_final')::integer,
    p_tournament ->> 'venue_name',
    p_tournament ->> 'venue_address',
    p_tournament ->> 'country',
    (p_tournament ->> 'starts_at')::timestamptz,
    (p_tournament ->> 'created_at')::timestamptz
  )
  into v_result;

  insert into public.tournament_finish_points (tournament_id, finish, points)
  select tournament_id, finish, points
    from jsonb_to_recordset(coalesce(p_finish_points, '[]'::jsonb))
      as payload(tournament_id uuid, finish finish_type, points integer)
  on conflict (tournament_id, finish) do update
    set points = excluded.points;

  insert into public.tournament_referees (tournament_id, profile_id)
  select tournament_id, profile_id
    from jsonb_to_recordset(coalesce(p_referees, '[]'::jsonb))
      as payload(tournament_id uuid, profile_id uuid)
  on conflict (tournament_id, profile_id) do nothing;

  insert into public.participants (
    id, tournament_id, display_name, seed, checked_in, inspected, deck_combos, status
  )
  select id, tournament_id, display_name, seed, checked_in, inspected, deck_combos, status
    from jsonb_to_recordset(coalesce(p_participants, '[]'::jsonb))
      as payload(
        id uuid,
        tournament_id uuid,
        display_name text,
        seed integer,
        checked_in boolean,
        inspected boolean,
        deck_combos text[],
        status participant_status
      )
  on conflict (id) do update set
    display_name = excluded.display_name,
    seed = excluded.seed,
    checked_in = excluded.checked_in,
    inspected = excluded.inspected,
    deck_combos = excluded.deck_combos,
    status = excluded.status;

  insert into public.stages (
    id, tournament_id, position, name, type, status, match_type,
    points_to_win, best_of, config
  )
  select id, tournament_id, position, name, type, status, match_type,
         points_to_win, best_of, config
    from jsonb_to_recordset(coalesce(p_stages, '[]'::jsonb))
      as payload(
        id uuid,
        tournament_id uuid,
        position integer,
        name text,
        type stage_type,
        status stage_status,
        match_type match_type,
        points_to_win integer,
        best_of integer,
        config jsonb
      )
  on conflict (id) do update set
    position = excluded.position,
    name = excluded.name,
    type = excluded.type,
    status = excluded.status,
    match_type = excluded.match_type,
    points_to_win = excluded.points_to_win,
    best_of = excluded.best_of,
    config = excluded.config;

  insert into public.groups (id, stage_id, name, position, referee_id)
  select id, stage_id, name, position, referee_id
    from jsonb_to_recordset(coalesce(p_groups, '[]'::jsonb))
      as payload(
        id uuid,
        stage_id uuid,
        name text,
        position integer,
        referee_id uuid
      )
  on conflict (id) do update set
    name = excluded.name,
    position = excluded.position,
    referee_id = excluded.referee_id;

  insert into public.group_participants (group_id, participant_id)
  select group_id, participant_id
    from jsonb_to_recordset(coalesce(p_group_participants, '[]'::jsonb))
      as payload(group_id uuid, participant_id uuid)
  on conflict (group_id, participant_id) do nothing;

  insert into public.rounds (id, stage_id, group_id, number, bracket, name)
  select id, stage_id, group_id, number, bracket, name
    from jsonb_to_recordset(coalesce(p_rounds, '[]'::jsonb))
      as payload(
        id uuid,
        stage_id uuid,
        group_id uuid,
        number integer,
        bracket text,
        name text
      )
  on conflict (id) do update set
    stage_id = excluded.stage_id,
    group_id = excluded.group_id,
    number = excluded.number,
    bracket = excluded.bracket,
    name = excluded.name;

  insert into public.matches (
    id, tournament_id, stage_id, round_id, group_id, position,
    participant1_id, participant2_id, winner_id, is_draw, is_bye,
    score1, score2, sets1, sets2, status, referee_id,
    next_match_winner_id, next_match_loser_id, version, outcome, outcome_note,
    reopened_at, reopened_by, reopen_reason, started_at, finished_at
  )
  select id, tournament_id, stage_id, round_id, group_id, position,
         participant1_id, participant2_id, winner_id, is_draw, is_bye,
         score1, score2, sets1, sets2, status, referee_id,
         next_match_winner_id, next_match_loser_id, version, outcome, outcome_note,
         reopened_at, reopened_by, reopen_reason, started_at, finished_at
    from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb))
      as payload(
        id uuid,
        tournament_id uuid,
        stage_id uuid,
        round_id uuid,
        group_id uuid,
        position integer,
        participant1_id uuid,
        participant2_id uuid,
        winner_id uuid,
        is_draw boolean,
        is_bye boolean,
        score1 integer,
        score2 integer,
        sets1 integer,
        sets2 integer,
        status match_status,
        referee_id uuid,
        next_match_winner_id uuid,
        next_match_loser_id uuid,
        version integer,
        outcome text,
        outcome_note text,
        reopened_at timestamptz,
        reopened_by uuid,
        reopen_reason text,
        started_at timestamptz,
        finished_at timestamptz
      )
  on conflict (id) do update set
    stage_id = excluded.stage_id,
    round_id = excluded.round_id,
    group_id = excluded.group_id,
    position = excluded.position,
    participant1_id = excluded.participant1_id,
    participant2_id = excluded.participant2_id,
    winner_id = excluded.winner_id,
    is_draw = excluded.is_draw,
    is_bye = excluded.is_bye,
    score1 = excluded.score1,
    score2 = excluded.score2,
    sets1 = excluded.sets1,
    sets2 = excluded.sets2,
    status = excluded.status,
    referee_id = excluded.referee_id,
    next_match_winner_id = excluded.next_match_winner_id,
    next_match_loser_id = excluded.next_match_loser_id,
    version = excluded.version,
    outcome = excluded.outcome,
    outcome_note = excluded.outcome_note,
    reopened_at = excluded.reopened_at,
    reopened_by = excluded.reopened_by,
    reopen_reason = excluded.reopen_reason,
    started_at = excluded.started_at,
    finished_at = excluded.finished_at;

  insert into public.battles (
    id, match_id, battle_number, set_number, scorer_id, finish,
    points, voided, recorded_by, created_at
  )
  select id, match_id, battle_number, set_number, scorer_id, finish,
         points, voided, recorded_by, created_at
    from jsonb_to_recordset(coalesce(p_battles, '[]'::jsonb))
      as payload(
        id uuid,
        match_id uuid,
        battle_number integer,
        set_number integer,
        scorer_id uuid,
        finish finish_type,
        points integer,
        voided boolean,
        recorded_by uuid,
        created_at timestamptz
      )
  on conflict (id) do update set
    battle_number = excluded.battle_number,
    set_number = excluded.set_number,
    scorer_id = excluded.scorer_id,
    finish = excluded.finish,
    points = excluded.points,
    voided = excluded.voided,
    recorded_by = excluded.recorded_by,
    created_at = excluded.created_at;

  insert into public.penalties (
    id, match_id, battle_id, participant_id, card, is_foul,
    points_awarded, awarded_to, reason, issued_by, created_at
  )
  select id, match_id, battle_id, participant_id, card, is_foul,
         points_awarded, awarded_to, reason, issued_by, created_at
    from jsonb_to_recordset(coalesce(p_penalties, '[]'::jsonb))
      as payload(
        id uuid,
        match_id uuid,
        battle_id uuid,
        participant_id uuid,
        card card_type,
        is_foul boolean,
        points_awarded integer,
        awarded_to uuid,
        reason text,
        issued_by uuid,
        created_at timestamptz
      )
  on conflict (id) do update set
    match_id = excluded.match_id,
    battle_id = excluded.battle_id,
    participant_id = excluded.participant_id,
    card = excluded.card,
    is_foul = excluded.is_foul,
    points_awarded = excluded.points_awarded,
    awarded_to = excluded.awarded_to,
    reason = excluded.reason,
    issued_by = excluded.issued_by,
    created_at = excluded.created_at;

  -- Reconcile rows removed from the local snapshot. Dependencies are removed
  -- first so a complete snapshot can safely delete obsolete match data.
  delete from public.penalties p
  using public.matches m
  where p.match_id = m.id
    and m.tournament_id = v_result.id
    and (
      not exists (
        select 1
          from jsonb_to_recordset(coalesce(p_penalties, '[]'::jsonb))
            as payload(id uuid)
         where payload.id = p.id
      )
      or not exists (
        select 1
          from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb))
            as payload(id uuid)
         where payload.id = p.match_id
      )
    );

  delete from public.battles b
  using public.matches m
  where b.match_id = m.id
    and m.tournament_id = v_result.id
    and (
      not exists (
        select 1
          from jsonb_to_recordset(coalesce(p_battles, '[]'::jsonb))
            as payload(id uuid)
         where payload.id = b.id
      )
      or not exists (
        select 1
          from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb))
            as payload(id uuid)
         where payload.id = b.match_id
      )
    );

  update public.matches
     set next_match_winner_id = null,
         next_match_loser_id = null
   where tournament_id = v_result.id
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb))
           as payload(id uuid)
        where payload.id = matches.id
     );

  delete from public.matches
   where tournament_id = v_result.id
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_matches, '[]'::jsonb))
           as payload(id uuid)
        where payload.id = matches.id
     );

  delete from public.group_participants gp
  using public.groups g
  join public.stages s on s.id = g.stage_id
  where gp.group_id = g.id
    and s.tournament_id = v_result.id
    and (
      not exists (
        select 1
          from jsonb_to_recordset(coalesce(p_group_participants, '[]'::jsonb))
            as payload(group_id uuid, participant_id uuid)
         where payload.group_id = gp.group_id
           and payload.participant_id = gp.participant_id
      )
      or not exists (
        select 1
          from jsonb_to_recordset(coalesce(p_groups, '[]'::jsonb))
            as payload(id uuid)
         where payload.id = gp.group_id
      )
    );

  delete from public.rounds
   where stage_id in (
     select id from public.stages where tournament_id = v_result.id
   )
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_rounds, '[]'::jsonb))
           as payload(id uuid)
        where payload.id = rounds.id
     );

  delete from public.groups
   where stage_id in (
     select id from public.stages where tournament_id = v_result.id
   )
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_groups, '[]'::jsonb))
           as payload(id uuid)
        where payload.id = groups.id
     );

  delete from public.stages
   where tournament_id = v_result.id
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_stages, '[]'::jsonb))
           as payload(id uuid)
        where payload.id = stages.id
     );

  delete from public.participants
   where tournament_id = v_result.id
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_participants, '[]'::jsonb))
           as payload(id uuid)
        where payload.id = participants.id
     );

  delete from public.tournament_referees
   where tournament_id = v_result.id
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_referees, '[]'::jsonb))
           as payload(profile_id uuid)
        where payload.profile_id = tournament_referees.profile_id
     );

  delete from public.tournament_finish_points
   where tournament_id = v_result.id
     and not exists (
       select 1
         from jsonb_to_recordset(coalesce(p_finish_points, '[]'::jsonb))
           as payload(finish finish_type)
        where payload.finish = tournament_finish_points.finish
     );

  return v_result;
end;
$$;

revoke all on function public.publish_tournament_snapshot(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.publish_tournament_snapshot(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;
