alter table public.tournaments add column revision bigint not null default 0;
create function apbey_private.mark_tournament_revision() returns trigger
language plpgsql set search_path='' as $$
begin
  new.revision := txid_current();
  return new;
end $$;
create trigger mark_revision before insert or update on public.tournaments
for each row execute function apbey_private.mark_tournament_revision();

create function apbey_private.touch_tournament_revision() returns trigger
language plpgsql security definer set search_path='' as $$
declare r jsonb; tid uuid;
begin
  r := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if r ? 'tournament_id' then tid := (r->>'tournament_id')::uuid;
  elsif r ? 'stage_id' then select tournament_id into tid from public.stages where id=(r->>'stage_id')::uuid;
  elsif r ? 'match_id' then select tournament_id into tid from public.matches where id=(r->>'match_id')::uuid;
  else select s.tournament_id into tid from public.groups g join public.stages s on s.id=g.stage_id where g.id=(r->>'group_id')::uuid;
  end if;
  update public.tournaments set revision=txid_current() where id=tid and revision<>txid_current();
  return null;
end $$;
do $$
declare t text;
begin
  foreach t in array array['matches','battles','penalties','groups','participants','rounds','stages','group_participants','tournament_referees','tournament_finish_points'] loop
    execute format('create trigger touch_revision after insert or update or delete on public.%I for each row execute function apbey_private.touch_tournament_revision()',t);
  end loop;
end $$;
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
  perform pg_advisory_xact_lock(hashtextextended(p_tournament->>'id',0));
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
