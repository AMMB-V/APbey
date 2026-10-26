/**
 * Complete Supabase PostgreSQL schema with RLS and Stored Procedures
 * Derived from the official Specification Document (Sections 7 & 8).
 * Ready to copy or run with `supabase db reset` or paste into Supabase SQL Editor.
 */

export const SUPABASE_MIGRATION_SQL = `-- ====================================================================
-- PLATAFORMA DE TORNEOS BEYBLADE X: ESQUEMA DE BASE DE DATOS Y RLS
-- Stack: Supabase (PostgreSQL 15 + RLS + Realtime)
-- ====================================================================

-- 1. TIPOS ENUMERADOS
create type user_role as enum ('admin', 'organizer', 'referee', 'blader');
create type tournament_status as enum ('draft', 'registration', 'in_progress', 'completed', 'cancelled');
create type stage_type as enum ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'group_stage');
create type stage_status as enum ('pending', 'in_progress', 'completed');
create type match_status as enum ('pending', 'in_progress', 'completed');
create type match_type as enum ('1on1', '3on3');
create type finish_type as enum ('spin', 'over', 'burst', 'xtreme');
create type card_type as enum ('yellow', 'red');
create type participant_status as enum ('registered', 'active', 'eliminated', 'disqualified', 'withdrawn');

-- 2. TABLA PROFILES (Extiende auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role user_role not null default 'referee',
  created_at timestamptz not null default now()
);

-- 3. TABLA TOURNAMENTS
create table tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  organizer_id uuid not null references profiles(id),
  status tournament_status not null default 'draft',
  is_public boolean not null default true,
  max_participants int,
  check_in_required boolean not null default false,
  entry_fee numeric(10,2) default 0,
  foul_points int not null default 1 check (foul_points >= 0),
  fouls_per_point int not null default 3 check (fouls_per_point > 0), -- Punto al rival tras 3 faltas acumuladas
  points_to_win_group int not null default 4 check (points_to_win_group > 0),    -- Parámetro 1: Grupos
  points_to_win_playoffs int not null default 5 check (points_to_win_playoffs > 0), -- Parámetro 2: Playoffs
  points_to_win_final int not null default 7 check (points_to_win_final > 0),       -- Parámetro 3: Gran Final
  venue_name text,
  venue_address text,
  country text default 'PA',
  starts_at timestamptz,
  created_at timestamptz not null default now()
);

-- 4. TABLA TOURNAMENT_FINISH_POINTS
create table tournament_finish_points (
  tournament_id uuid references tournaments(id) on delete cascade,
  finish finish_type,
  points int not null check (points >= 0),
  primary key (tournament_id, finish)
);

-- Trigger para inicializar puntos por finish por defecto (spin 1, over 2, burst 2, xtreme 3)
create or replace function seed_finish_points() returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into tournament_finish_points (tournament_id, finish, points)
  values 
    (new.id, 'spin', 1),
    (new.id, 'over', 2),
    (new.id, 'burst', 2),
    (new.id, 'xtreme', 3);
  return new;
end $$;

create trigger tournaments_seed_points 
after insert on tournaments
for each row execute function seed_finish_points();

-- 5. TABLA TOURNAMENT_REFEREES
create table tournament_referees (
  tournament_id uuid references tournaments(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (tournament_id, profile_id)
);

-- 6. TABLA PARTICIPANTS
create table participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  profile_id uuid references profiles(id),
  display_name text not null,
  seed int,
  checked_in boolean not null default false,
  inspected boolean not null default false,
  status participant_status not null default 'registered',
  unique (tournament_id, seed)
);

-- 7. TABLA STAGES
create table stages (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  position int not null,
  name text not null,
  type stage_type not null,
  status stage_status not null default 'pending',
  match_type match_type not null default '3on3',
  points_to_win int not null default 4 check (points_to_win > 0),
  best_of int not null default 1 check (best_of in (1, 3, 5, 7)),
  config jsonb not null default '{}'::jsonb,
  unique (tournament_id, position)
);

-- 8. TABLA GROUPS Y GROUP_PARTICIPANTS
create table groups (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  name text not null,
  position int not null,
  referee_id uuid references profiles(id)
);

create table group_participants (
  group_id uuid references groups(id) on delete cascade,
  participant_id uuid references participants(id) on delete cascade,
  primary key (group_id, participant_id)
);

-- 9. TABLA ROUNDS
create table rounds (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  group_id uuid references groups(id) on delete cascade,
  number int not null,
  bracket text not null check (bracket in ('winners', 'losers', 'grand_final', 'group', 'swiss')),
  name text
);

-- 10. TABLA MATCHES
create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  stage_id uuid not null references stages(id) on delete cascade,
  round_id uuid not null references rounds(id) on delete cascade,
  group_id uuid references groups(id),
  position int not null,
  participant1_id uuid references participants(id),
  participant2_id uuid references participants(id),
  winner_id uuid references participants(id),
  is_draw boolean not null default false,
  is_bye boolean not null default false,
  score1 int not null default 0,
  score2 int not null default 0,
  sets1 int not null default 0,
  sets2 int not null default 0,
  status match_status not null default 'pending',
  referee_id uuid references profiles(id),
  next_match_winner_id uuid references matches(id),
  next_match_loser_id uuid references matches(id),
  version int not null default 1,
  started_at timestamptz,
  finished_at timestamptz,
  check (not is_draw or winner_id is null)
);

-- 11. TABLA BATTLES
create table battles (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  battle_number int not null,
  set_number int not null default 1,
  scorer_id uuid references participants(id),
  finish finish_type,
  points int not null default 0,
  voided boolean not null default false,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  unique (match_id, battle_number),
  check ((scorer_id is null) = (finish is null))
);

-- 12. TABLA PENALTIES
create table penalties (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  battle_id uuid references battles(id),
  participant_id uuid not null references participants(id),
  card card_type not null,
  is_foul boolean not null default true,
  points_awarded int not null default 0,
  awarded_to uuid references participants(id),
  reason text,
  issued_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- 13. TABLA AUDIT_LOG
create table audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  actor uuid,
  created_at timestamptz not null default now()
);

-- ÍNDICES DE RENDIMIENTO
create index idx_participants_tournament on participants (tournament_id);
create index idx_matches_stage_round on matches (stage_id, round_id);
create index idx_matches_referee_active on matches (referee_id) where status <> 'completed';
create index idx_battles_match on battles (match_id);

-- 14. SEGURIDAD (ROW LEVEL SECURITY)
alter table profiles enable row level security;
alter table tournaments enable row level security;
alter table tournament_finish_points enable row level security;
alter table tournament_referees enable row level security;
alter table participants enable row level security;
alter table stages enable row level security;
alter table groups enable row level security;
alter table group_participants enable row level security;
alter table rounds enable row level security;
alter table matches enable row level security;
alter table battles enable row level security;
alter table penalties enable row level security;
alter table audit_log enable row level security;

-- FUNCIONES DE RLS
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function is_organizer() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'organizer'));
$$;

create or replace function manages_tournament(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select is_admin() or exists (select 1 from tournaments where id = t and organizer_id = auth.uid());
$$;

create or replace function referees_match(m uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from matches where id = m and referee_id = auth.uid());
$$;

create or replace function can_read_tournament(t uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tournaments where id = t and (
      is_public or manages_tournament(t) or exists (select 1 from tournament_referees r where r.tournament_id = t and r.profile_id = auth.uid())
    )
  );
$$;

-- POLÍTICAS RLS ESPECÍFICAS
create policy profiles_read on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_admin_update on profiles for update using (is_admin()) with check (is_admin());

create policy tournaments_read on tournaments for select using (can_read_tournament(id));
create policy tournaments_insert on tournaments for insert with check (is_organizer() and organizer_id = auth.uid());
create policy tournaments_update on tournaments for update using (manages_tournament(id)) with check (manages_tournament(id));
create policy tournaments_delete on tournaments for delete using (manages_tournament(id));

create policy matches_read on matches for select using (can_read_tournament(tournament_id));
create policy matches_manage on matches for all using (manages_tournament(tournament_id)) with check (manages_tournament(tournament_id));

-- 15. FUNCIÓN TRANSACCIONAL: record_battle
create or replace function record_battle(
  p_match uuid, 
  p_scorer uuid, 
  p_finish finish_type, 
  p_expected_version int
)
returns matches language plpgsql security definer set search_path = public as $$
declare
  m matches;
  s stages;
  pts int;
  need int;
  scorer_is_p1 boolean;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match) or manages_tournament(m.tournament_id)) then raise exception 'forbidden'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if p_scorer not in (m.participant1_id, m.participant2_id) then raise exception 'invalid_scorer'; end if;

  select * into s from stages where id = m.stage_id;
  select points into pts from tournament_finish_points where tournament_id = m.tournament_id and finish = p_finish;

  scorer_is_p1 := (p_scorer = m.participant1_id);

  insert into battles (match_id, battle_number, set_number, scorer_id, finish, points, recorded_by)
  values (p_match, (select coalesce(max(battle_number), 0) + 1 from battles where match_id = p_match),
          m.sets1 + m.sets2 + 1, p_scorer, p_finish, pts, auth.uid());

  if scorer_is_p1 then m.score1 := m.score1 + pts; else m.score2 := m.score2 + pts; end if;
  m.status := 'in_progress';

  if greatest(m.score1, m.score2) >= s.points_to_win then
    if scorer_is_p1 then m.sets1 := m.sets1 + 1; else m.sets2 := m.sets2 + 1; end if;
    need := s.best_of / 2 + 1;
    if m.sets1 >= need or m.sets2 >= need then
      m.status := 'completed';
      m.winner_id := case when m.sets1 >= need then m.participant1_id else m.participant2_id end;
      m.finished_at := now();
    else
      m.score1 := 0;
      m.score2 := 0;
    end if;
  end if;

  update matches set 
    score1 = m.score1, score2 = m.score2, sets1 = m.sets1, sets2 = m.sets2,
    status = m.status, winner_id = m.winner_id, finished_at = m.finished_at,
    started_at = coalesce(started_at, now()), version = version + 1
  where id = p_match returning * into m;

  return m;
end $$;
`;
