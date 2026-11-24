-- Official APBey ranking category used to award placement points.
alter table public.tournaments
  add column if not exists category text not null default 'clash'
  check (category in ('super', 'grand', 'clash', 'twisted'));

comment on column public.tournaments.category is
  'Official ranking scale: super/grand use the major table; clash/twisted use the standard table.';

-- Keep category and participant profile identity in the same transaction as
-- the existing snapshot publisher without changing its public contract.
alter function public.publish_tournament_snapshot(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) rename to publish_tournament_snapshot_without_ranking_metadata;

alter function public.publish_tournament_snapshot_without_ranking_metadata(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) set schema apbey_private;

revoke all on function apbey_private.publish_tournament_snapshot_without_ranking_metadata(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function apbey_private.publish_tournament_snapshot_without_ranking_metadata(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;

create function public.publish_tournament_snapshot(
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

  return v_result;
end;
$$;

revoke all on function public.publish_tournament_snapshot(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.publish_tournament_snapshot(
  jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb
) to authenticated;
