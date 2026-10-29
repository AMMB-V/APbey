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
create policy ranking_entries_admin_write on ranking_entries
  for all to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists hall_of_fame_public_read on hall_of_fame_entries;
create policy hall_of_fame_public_read on hall_of_fame_entries
  for select using (true);

drop policy if exists hall_of_fame_admin_write on hall_of_fame_entries;
create policy hall_of_fame_admin_write on hall_of_fame_entries
  for all to authenticated
  using (is_admin())
  with check (is_admin());
