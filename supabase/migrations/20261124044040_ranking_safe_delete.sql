create or replace function public.publish_rankings(
  p_rankings jsonb,
  p_hall_of_fame jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  delete from ranking_entries where id is not null;
  delete from hall_of_fame_entries where id is not null;

  insert into ranking_entries (
    id, name, points, elo, wins, losses, tournaments_won, favorite_combo
  )
  select
    id, name, points, elo, wins, losses, tournaments_won, favorite_combo
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
    id, tournament_title, champion, runner_up, date, winning_combo, participants_count
  )
  select
    id, tournament_title, champion, runner_up, date, winning_combo, participants_count
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

revoke all on function publish_rankings(jsonb, jsonb) from public, anon, authenticated;
grant execute on function publish_rankings(jsonb, jsonb) to authenticated;
