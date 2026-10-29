-- Official ranking publication data imported by administrators.
create table if not exists ranking_entries (
  id text primary key,
  name text not null,
  points integer not null default 0 check (points >= 0),
  elo integer not null default 0 check (elo >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  tournaments_won integer not null default 0 check (tournaments_won >= 0),
  favorite_combo text,
  updated_at timestamptz not null default now()
);

create table if not exists hall_of_fame_entries (
  id text primary key,
  tournament_title text not null,
  champion text not null,
  runner_up text,
  date text,
  winning_combo text,
  participants_count integer check (participants_count is null or participants_count >= 0),
  updated_at timestamptz not null default now()
);

alter table ranking_entries enable row level security;
alter table hall_of_fame_entries enable row level security;

drop policy if exists ranking_entries_public_read on ranking_entries;
create policy ranking_entries_public_read on ranking_entries
  for select using (true);

drop policy if exists ranking_entries_admin_write on ranking_entries;
create policy ranking_entries_admin_insert on ranking_entries
  for insert to authenticated
  with check (is_admin());

create policy ranking_entries_admin_update on ranking_entries
  for update to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists hall_of_fame_public_read on hall_of_fame_entries;
create policy hall_of_fame_public_read on hall_of_fame_entries
  for select using (true);

drop policy if exists hall_of_fame_admin_write on hall_of_fame_entries;
create policy hall_of_fame_admin_insert on hall_of_fame_entries
  for insert to authenticated
  with check (is_admin());

create policy hall_of_fame_admin_update on hall_of_fame_entries
  for update to authenticated
  using (is_admin())
  with check (is_admin());

create policy ranking_entries_admin_delete on ranking_entries
  for delete to authenticated
  using (is_admin());

create policy hall_of_fame_admin_delete on hall_of_fame_entries
  for delete to authenticated
  using (is_admin());

create or replace function publish_rankings(
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

  delete from ranking_entries;
  delete from hall_of_fame_entries;

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
