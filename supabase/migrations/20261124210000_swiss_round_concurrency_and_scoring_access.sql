-- Persist operational table assignments and make Swiss round creation atomic.
alter table public.matches
  add column if not exists station text,
  add column if not exists called_to_station boolean not null default false;

-- Organizers are event officials and may score matches in tournaments they can read.
-- Structural tournament management remains restricted by manages_tournament().
create or replace function public.referees_match(m uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles profile
      join public.matches match on match.id = m
      join public.tournaments tournament on tournament.id = match.tournament_id
     where profile.id = (select auth.uid())
       and profile.role in ('admin', 'organizer')
       and (public.manages_tournament(tournament.id) or exists (
         select 1 from public.tournament_referees referee
          where referee.tournament_id = tournament.id
            and referee.profile_id = (select auth.uid())
       ))
  ) or exists (
    select 1
      from public.matches match
     where match.id = m
       and match.referee_id = (select auth.uid())
  );
$$;
revoke all on function public.referees_match(uuid) from public, anon;
grant execute on function public.referees_match(uuid) to authenticated;

-- Snapshot publication upserts immutable event rows. Owners need UPDATE for the
-- conflict branch when a referee already created those rows.
drop policy if exists battles_owner_update on public.battles;
create policy battles_owner_update on public.battles
  for update to authenticated
  using (exists (
    select 1 from public.matches match
     where match.id = battles.match_id and public.manages_tournament(match.tournament_id)
  ))
  with check (exists (
    select 1 from public.matches match
     where match.id = battles.match_id and public.manages_tournament(match.tournament_id)
  ));
drop policy if exists penalties_owner_update on public.penalties;
create policy penalties_owner_update on public.penalties
  for update to authenticated
  using (exists (
    select 1 from public.matches match
     where match.id = penalties.match_id and public.manages_tournament(match.tournament_id)
  ))
  with check (exists (
    select 1 from public.matches match
     where match.id = penalties.match_id and public.manages_tournament(match.tournament_id)
  ));

create or replace function public.create_next_swiss_round(
  p_stage_id uuid,
  p_expected_round_count integer,
  p_round jsonb,
  p_matches jsonb
)
returns public.rounds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.stages;
  v_round public.rounds;
  v_round_count integer;
begin
  if (select auth.uid()) is null then raise exception 'auth_required'; end if;
  select * into v_stage from public.stages where id = p_stage_id for update;
  if not found or v_stage.type <> 'swiss' then raise exception 'invalid_swiss_stage'; end if;
  if not public.manages_tournament(v_stage.tournament_id) then raise exception 'forbidden'; end if;
  if v_stage.status <> 'in_progress' then raise exception 'stage_not_active'; end if;

  select count(*) into v_round_count
    from public.rounds where stage_id = p_stage_id and bracket = 'swiss';
  if v_round_count <> p_expected_round_count then raise exception 'round_conflict'; end if;
  if (p_round->>'number')::integer <> v_round_count + 1 then raise exception 'invalid_round_number'; end if;
  if exists (
    select 1 from public.matches
     where stage_id = p_stage_id and status <> 'completed'
  ) then raise exception 'previous_round_incomplete'; end if;

  insert into public.rounds(id, stage_id, group_id, number, bracket, name)
  values (
    (p_round->>'id')::uuid, p_stage_id, null,
    (p_round->>'number')::integer, 'swiss', p_round->>'name'
  ) returning * into v_round;

  insert into public.matches(
    id,tournament_id,stage_id,round_id,position,participant1_id,participant2_id,
    winner_id,is_draw,is_bye,score1,score2,sets1,sets2,status,referee_id,station,version
  )
  select id,v_stage.tournament_id,p_stage_id,v_round.id,position,participant1_id,participant2_id,
         winner_id,is_draw,is_bye,score1,score2,sets1,sets2,status,referee_id,station,version
    from jsonb_to_recordset(coalesce(p_matches,'[]'::jsonb)) as payload(
      id uuid,tournament_id uuid,stage_id uuid,round_id uuid,position integer,
      participant1_id uuid,participant2_id uuid,winner_id uuid,is_draw boolean,is_bye boolean,
      score1 integer,score2 integer,sets1 integer,sets2 integer,status public.match_status,
      referee_id uuid,station text,version integer
    );
  if not exists (select 1 from public.matches where round_id = v_round.id) then
    raise exception 'round_without_matches';
  end if;
  return v_round;
end;
$$;
revoke all on function public.create_next_swiss_round(uuid,integer,jsonb,jsonb) from public, anon;
grant execute on function public.create_next_swiss_round(uuid,integer,jsonb,jsonb) to authenticated;

create or replace function public.assign_swiss_round_resources(p_stage_id uuid, p_station_count integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_stage public.stages;
  v_round_id uuid;
  v_updated integer;
begin
  if p_station_count < 1 or p_station_count > 64 then raise exception 'invalid_station_count'; end if;
  select * into v_stage from public.stages where id = p_stage_id for update;
  if not found or v_stage.type <> 'swiss' then raise exception 'invalid_swiss_stage'; end if;
  if not public.manages_tournament(v_stage.tournament_id) then raise exception 'forbidden'; end if;
  update public.stages
     set config = jsonb_set(coalesce(config,'{}'::jsonb), '{swissStations}', to_jsonb(p_station_count), true)
   where id = p_stage_id;
  select id into v_round_id from public.rounds
   where stage_id = p_stage_id and bracket = 'swiss' order by number desc limit 1;

  with officials as (
    select profile_id, row_number() over(order by profile_id) as seq,
           count(*) over() as total
      from public.tournament_referees where tournament_id = v_stage.tournament_id
  ), scheduled as (
    select match.id, row_number() over(order by match.position) - 1 as seq
      from public.matches match where match.round_id = v_round_id and not match.is_bye
  )
  update public.matches match
     set station = 'Mesa ' || ((scheduled.seq % p_station_count) + 1),
         referee_id = coalesce((select official.profile_id from officials official
           where official.seq = (scheduled.seq % official.total) + 1), match.referee_id),
         version = match.version + 1
    from scheduled where match.id = scheduled.id and match.status <> 'completed';
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;
revoke all on function public.assign_swiss_round_resources(uuid,integer) from public, anon;
grant execute on function public.assign_swiss_round_resources(uuid,integer) to authenticated;

create or replace function public.set_match_resources(p_resources jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_updated integer;
begin
  update public.matches match
     set station = resource.station,
         called_to_station = resource.called_to_station
    from jsonb_to_recordset(coalesce(p_resources,'[]'::jsonb))
      as resource(id uuid, station text, called_to_station boolean)
   where match.id = resource.id and public.manages_tournament(match.tournament_id);
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;
revoke all on function public.set_match_resources(jsonb) from public, anon;
grant execute on function public.set_match_resources(jsonb) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname='supabase_realtime' and schemaname='public' and tablename='rounds'
  ) then alter publication supabase_realtime add table public.rounds; end if;
end $$;
