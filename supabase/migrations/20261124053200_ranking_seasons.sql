alter table public.ranking_entries
  add column season integer not null default 1 check (season in (1, 2)),
  drop constraint ranking_entries_pkey,
  add primary key (season, id);

alter table public.hall_of_fame_entries
  add column season integer not null default 1 check (season in (1, 2)),
  drop constraint hall_of_fame_entries_pkey,
  add primary key (season, id);

create or replace function public.publish_season_rankings(
  p_season integer,
  p_rankings jsonb,
  p_hall_of_fame jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'forbidden';
  end if;

  if p_season is null or p_season not in (1, 2) then
    raise exception 'invalid_ranking_season';
  end if;
  perform pg_advisory_xact_lock(32469, p_season);

  delete from ranking_entries where season = p_season;
  delete from hall_of_fame_entries where season = p_season;

  insert into ranking_entries (
    season, id, name, points, elo, wins, losses, tournaments_won, favorite_combo
  )
  select
    p_season, id, name, points, elo, wins, losses, tournaments_won, favorite_combo
  from jsonb_to_recordset(coalesce(p_rankings, '[]'::jsonb)) as ranking(
    id text,
    name text,
    points integer,
    elo integer,
    wins integer,
    losses integer,
    tournaments_won integer,
    favorite_combo text
  );

  insert into hall_of_fame_entries (
    season, id, tournament_title, champion, runner_up, date, winning_combo, participants_count
  )
  select
    p_season, id, tournament_title, champion, runner_up, date, winning_combo, participants_count
  from jsonb_to_recordset(coalesce(p_hall_of_fame, '[]'::jsonb)) as hall(
    id text,
    tournament_title text,
    champion text,
    runner_up text,
    date text,
    winning_combo text,
    participants_count integer
  );
end;
$$;

revoke all on function public.publish_season_rankings(integer,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.publish_season_rankings(integer,jsonb,jsonb) to authenticated;

-- Older clients can only replace the original season.
create or replace function public.publish_rankings(p_rankings jsonb,p_hall_of_fame jsonb)
returns void language sql security invoker set search_path = ''
as $$ select public.publish_season_rankings(1,p_rankings,p_hall_of_fame); $$;
