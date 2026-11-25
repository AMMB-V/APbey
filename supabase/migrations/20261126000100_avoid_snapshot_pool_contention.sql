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
set search_path = ''
as $$
declare
  v_result public.tournaments;
begin
  if not pg_try_advisory_xact_lock(hashtextextended(p_tournament->>'id',0)) then
    raise exception 'concurrent_tournament_update' using errcode='40001';
  end if;
  select * into v_result from public.tournaments where id=(p_tournament->>'id')::uuid for update;
  if found and v_result.revision is distinct from (p_tournament->>'expected_revision')::bigint then
    raise exception 'stale_tournament' using errcode='40001';
  end if;
  select * into v_result
  from apbey_private.publish_tournament_snapshot_without_ranking_metadata(
    p_tournament, p_finish_points, p_referees, p_participants, p_stages,
    p_groups, p_group_participants, p_rounds, p_matches, p_battles, p_penalties
  );

  update public.tournaments
  set category = coalesce(nullif(p_tournament ->> 'category', ''), 'clash')
  where id = v_result.id
  returning * into v_result;

  update public.participants as participant
  set profile_id = payload.profile_id
  from jsonb_to_recordset(coalesce(p_participants, '[]'::jsonb))
    as payload(id uuid, profile_id uuid)
  where participant.id = payload.id
    and participant.tournament_id = v_result.id;

  perform public.set_match_resources(coalesce(p_matches,'[]'));
  return v_result;
end;
$$;
