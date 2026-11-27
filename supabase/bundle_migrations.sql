-- =====================================================================
-- APbey Arena - Consolidated Migration Bundle
-- Total Migrations: 51
-- Generated automatically for Supabase SQL Editor execution
-- =====================================================================



-- ---------------------------------------------------------------------

-- Migration: 20261105000001_initial_schema.sql

-- ---------------------------------------------------------------------

-- ====================================================================
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




-- ---------------------------------------------------------------------

-- Migration: 20261105000002_invitation_email_delivery.sql

-- ---------------------------------------------------------------------

-- Invitations and transactional email delivery state.
create table if not exists public.invitations (
  id text primary key,
  email text not null,
  role user_role not null,
  tournament_id text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invited_by text not null,
  code text unique not null,
  created_at timestamptz not null default now(),
  email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed')),
  email_message_id text,
  email_error text,
  email_sent_at timestamptz
);

alter table public.invitations enable row level security;

drop policy if exists invitations_admin_read on public.invitations;
create policy invitations_admin_read on public.invitations
  for select using (is_admin());

drop policy if exists invitations_admin_insert on public.invitations;
create policy invitations_admin_insert on public.invitations
  for insert with check (is_admin() and invited_by = auth.uid()::text);

drop policy if exists invitations_admin_update on public.invitations;
create policy invitations_admin_update on public.invitations
  for update using (is_admin()) with check (is_admin());

drop policy if exists invitations_claim_update on public.invitations;
create policy invitations_claim_update on public.invitations
  for update using (
    auth.uid() is not null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) with check (status in ('accepted', 'revoked'));

alter table public.invitations
  add column if not exists email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed')),
  add column if not exists email_message_id text,
  add column if not exists email_error text,
  add column if not exists email_sent_at timestamptz;

create index if not exists invitations_email_status_idx
  on public.invitations (email_status);

create index if not exists invitations_code_idx
  on public.invitations (code);




-- ---------------------------------------------------------------------

-- Migration: 20261105000003_profile_self_update.sql

-- ---------------------------------------------------------------------

-- Allow authenticated users to update only their own public display name.
-- Email and password remain managed by Supabase Auth.
create or replace function update_my_profile(p_display_name text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if length(trim(p_display_name)) < 2 or length(trim(p_display_name)) > 100 then
    raise exception 'display_name_invalid';
  end if;

  update profiles
     set display_name = trim(p_display_name)
   where id = auth.uid()
   returning * into updated_profile;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function update_my_profile(text) from public;
grant execute on function update_my_profile(text) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000004_security_hardening.sql

-- ---------------------------------------------------------------------

-- Security hardening based on the live Supabase advisor audit.
-- This migration is idempotent and preserves existing tournament data.

alter table public.tournament_finish_points enable row level security;
alter table public.tournament_referees enable row level security;
alter table public.participants enable row level security;
alter table public.stages enable row level security;
alter table public.groups enable row level security;
alter table public.group_participants enable row level security;
alter table public.rounds enable row level security;
alter table public.battles enable row level security;
alter table public.penalties enable row level security;
alter table public.audit_log enable row level security;

-- Some existing projects were initialized without this helper function.
-- Define it before policies that use it so this migration is self-contained.
create or replace function public.referees_match(m uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.matches
    where id = m
      and referee_id = (select auth.uid())
  );
$$;

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_admin_read on public.profiles
  for select to authenticated using (is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update to authenticated using (is_admin()) with check (is_admin());

drop policy if exists tournaments_read on public.tournaments;
create policy tournaments_read on public.tournaments
  for select to anon, authenticated using (can_read_tournament(id));
drop policy if exists tournaments_insert on public.tournaments;
create policy tournaments_insert on public.tournaments
  for insert to authenticated
  with check (is_organizer() and organizer_id = (select auth.uid()));
drop policy if exists tournaments_update on public.tournaments;
create policy tournaments_update on public.tournaments
  for update to authenticated using (manages_tournament(id))
  with check (manages_tournament(id));
drop policy if exists tournaments_delete on public.tournaments;
create policy tournaments_delete on public.tournaments
  for delete to authenticated using (manages_tournament(id));

drop policy if exists matches_read on public.matches;
drop policy if exists matches_manage on public.matches;
create policy matches_read on public.matches
  for select to anon, authenticated using (can_read_tournament(tournament_id));
create policy matches_manage on public.matches
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists tournament_finish_points_read on public.tournament_finish_points;
create policy tournament_finish_points_read on public.tournament_finish_points
  for select to anon, authenticated using (can_read_tournament(tournament_id));
drop policy if exists tournament_finish_points_manage on public.tournament_finish_points;
create policy tournament_finish_points_manage on public.tournament_finish_points
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists tournament_referees_read on public.tournament_referees;
create policy tournament_referees_read on public.tournament_referees
  for select to anon, authenticated using (can_read_tournament(tournament_id));
drop policy if exists tournament_referees_manage on public.tournament_referees;
create policy tournament_referees_manage on public.tournament_referees
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists participants_read on public.participants;
drop policy if exists participants_write on public.participants;
drop policy if exists participants_manage on public.participants;
create policy participants_read on public.participants
  for select to anon, authenticated using (can_read_tournament(tournament_id));
create policy participants_manage on public.participants
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists stages_read on public.stages;
drop policy if exists stages_write on public.stages;
drop policy if exists stages_manage on public.stages;
create policy stages_read on public.stages
  for select to anon, authenticated using (can_read_tournament(tournament_id));
create policy stages_manage on public.stages
  for all to authenticated using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists groups_read on public.groups;
drop policy if exists groups_manage on public.groups;
create policy groups_read on public.groups
  for select to anon, authenticated using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and can_read_tournament(s.tournament_id)
    )
  );
create policy groups_manage on public.groups
  for all to authenticated using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_read on public.group_participants;
drop policy if exists group_participants_manage on public.group_participants;
create policy group_participants_read on public.group_participants
  for select to anon, authenticated using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and can_read_tournament(s.tournament_id)
    )
  );
create policy group_participants_manage on public.group_participants
  for all to authenticated using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_read on public.rounds;
drop policy if exists rounds_manage on public.rounds;
create policy rounds_read on public.rounds
  for select to anon, authenticated using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and can_read_tournament(s.tournament_id)
    )
  );
create policy rounds_manage on public.rounds
  for all to authenticated using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists battles_read on public.battles;
drop policy if exists battles_record on public.battles;
create policy battles_read on public.battles
  for select to anon, authenticated using (
    exists (
      select 1
      from public.matches m
      where m.id = battles.match_id
        and can_read_tournament(m.tournament_id)
    )
  );
create policy battles_record on public.battles
  for insert to authenticated with check (
    exists (
      select 1
      from public.matches m
      where m.id = battles.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists penalties_read on public.penalties;
drop policy if exists penalties_record on public.penalties;
create policy penalties_read on public.penalties
  for select to anon, authenticated using (
    exists (
      select 1
      from public.matches m
      where m.id = penalties.match_id
        and can_read_tournament(m.tournament_id)
    )
  );
create policy penalties_record on public.penalties
  for insert to authenticated with check (
    exists (
      select 1
      from public.matches m
      where m.id = penalties.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists audit_log_admin_read on public.audit_log;
drop policy if exists audit_log_authenticated_insert on public.audit_log;
create policy audit_log_admin_read on public.audit_log
  for select to authenticated using (is_admin());
create policy audit_log_authenticated_insert on public.audit_log
  for insert to authenticated with check (
    (select auth.uid()) is not null
    and actor = (select auth.uid())
  );

-- Consolidate invitation UPDATE policies to avoid permissive-policy overlap.
drop policy if exists invitations_admin_update on public.invitations;
drop policy if exists invitations_claim_update on public.invitations;
drop policy if exists "Invitaciones canje propio" on public.invitations;
create policy invitations_update on public.invitations
  for update to authenticated
  using (
    is_admin()
    or (
      (select auth.uid()) is not null
      and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  )
  with check (
    is_admin() or status in ('accepted', 'revoked')
  );

-- Keep public tournament reads possible through the table policies, but prevent
-- direct RPC probing of internal authorization helpers and mutating functions.
revoke all on function can_read_tournament(uuid) from public, anon, authenticated;
revoke all on function is_admin() from anon, authenticated;
revoke all on function is_organizer() from anon, authenticated;
revoke all on function manages_tournament(uuid) from anon, authenticated;
revoke all on function referees_match(uuid) from anon, authenticated;
revoke all on function record_battle(uuid, uuid, finish_type, integer) from anon, authenticated;
do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'record_penalty'
       and pg_get_function_identity_arguments(p.oid) =
           'uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer'
  ) then
    revoke all on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
      from anon, authenticated;
  end if;
end
$$;
revoke all on function seed_finish_points() from anon, authenticated;

grant execute on function record_battle(uuid, uuid, finish_type, integer) to authenticated;
do $$
begin
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'record_penalty'
       and pg_get_function_identity_arguments(p.oid) =
           'uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer'
  ) then
    grant execute on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
      to authenticated;
  end if;
end
$$;
grant execute on function seed_finish_points() to authenticated;

-- Cover foreign keys identified by the performance advisor.
create index if not exists battles_recorded_by_idx on public.battles (recorded_by);
create index if not exists battles_scorer_id_idx on public.battles (scorer_id);
create index if not exists group_participants_participant_id_idx on public.group_participants (participant_id);
create index if not exists groups_referee_id_idx on public.groups (referee_id);
create index if not exists groups_stage_id_idx on public.groups (stage_id);
create index if not exists matches_group_id_idx on public.matches (group_id);
create index if not exists matches_next_match_loser_id_idx on public.matches (next_match_loser_id);
create index if not exists matches_next_match_winner_id_idx on public.matches (next_match_winner_id);
create index if not exists matches_participant1_id_idx on public.matches (participant1_id);
create index if not exists matches_participant2_id_idx on public.matches (participant2_id);
create index if not exists matches_round_id_idx on public.matches (round_id);
create index if not exists matches_tournament_id_idx on public.matches (tournament_id);
create index if not exists matches_winner_id_idx on public.matches (winner_id);
create index if not exists participants_profile_id_idx on public.participants (profile_id);
create index if not exists penalties_awarded_to_idx on public.penalties (awarded_to);
create index if not exists penalties_battle_id_idx on public.penalties (battle_id);
create index if not exists penalties_issued_by_idx on public.penalties (issued_by);
create index if not exists penalties_match_id_idx on public.penalties (match_id);
create index if not exists penalties_participant_id_idx on public.penalties (participant_id);
create index if not exists rounds_group_id_idx on public.rounds (group_id);
create index if not exists rounds_stage_id_idx on public.rounds (stage_id);
create index if not exists tournament_referees_profile_id_idx on public.tournament_referees (profile_id);
create index if not exists tournaments_organizer_id_idx on public.tournaments (organizer_id);




-- ---------------------------------------------------------------------

-- Migration: 20261105000005_security_rls_completion.sql

-- ---------------------------------------------------------------------

-- Completa las políticas RLS del esquema inicial.
-- audit_log es la tabla canónica de auditoría.

alter table tournament_finish_points enable row level security;
alter table tournament_referees enable row level security;
alter table participants enable row level security;
alter table stages enable row level security;
alter table groups enable row level security;
alter table group_participants enable row level security;
alter table rounds enable row level security;
alter table battles enable row level security;
alter table penalties enable row level security;
alter table audit_log enable row level security;

drop policy if exists tournament_finish_points_read on tournament_finish_points;
create policy tournament_finish_points_read on tournament_finish_points
  for select using (can_read_tournament(tournament_id));

drop policy if exists tournament_finish_points_manage on tournament_finish_points;
create policy tournament_finish_points_manage on tournament_finish_points
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists tournament_referees_read on tournament_referees;
create policy tournament_referees_read on tournament_referees
  for select using (can_read_tournament(tournament_id));

drop policy if exists tournament_referees_manage on tournament_referees;
create policy tournament_referees_manage on tournament_referees
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists participants_read on participants;
create policy participants_read on participants
  for select using (can_read_tournament(tournament_id));

drop policy if exists participants_manage on participants;
create policy participants_manage on participants
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists stages_read on stages;
create policy stages_read on stages
  for select using (can_read_tournament(tournament_id));

drop policy if exists stages_manage on stages;
create policy stages_manage on stages
  for all using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));

drop policy if exists groups_read on groups;
create policy groups_read on groups
  for select using (
    exists (
      select 1 from stages s
      where s.id = groups.stage_id and can_read_tournament(s.tournament_id)
    )
  );

drop policy if exists groups_manage on groups;
create policy groups_manage on groups
  for all using (
    exists (
      select 1 from stages s
      where s.id = groups.stage_id and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from stages s
      where s.id = groups.stage_id and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_read on group_participants;
create policy group_participants_read on group_participants
  for select using (
    exists (
      select 1
      from groups g
      join stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and can_read_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_manage on group_participants;
create policy group_participants_manage on group_participants
  for all using (
    exists (
      select 1
      from groups g
      join stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from groups g
      join stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_read on rounds;
create policy rounds_read on rounds
  for select using (
    exists (
      select 1 from stages s
      where s.id = rounds.stage_id and can_read_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_manage on rounds;
create policy rounds_manage on rounds
  for all using (
    exists (
      select 1 from stages s
      where s.id = rounds.stage_id and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from stages s
      where s.id = rounds.stage_id and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists battles_read on battles;
create policy battles_read on battles
  for select using (
    exists (
      select 1 from matches m
      where m.id = battles.match_id and can_read_tournament(m.tournament_id)
    )
  );

drop policy if exists battles_record on battles;
create policy battles_record on battles
  for insert with check (
    exists (
      select 1 from matches m
      where m.id = battles.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists penalties_read on penalties;
create policy penalties_read on penalties
  for select using (
    exists (
      select 1 from matches m
      where m.id = penalties.match_id and can_read_tournament(m.tournament_id)
    )
  );

drop policy if exists penalties_record on penalties;
create policy penalties_record on penalties
  for insert with check (
    exists (
      select 1 from matches m
      where m.id = penalties.match_id
        and (referees_match(m.id) or manages_tournament(m.tournament_id))
    )
  );

drop policy if exists audit_log_admin_read on audit_log;
create policy audit_log_admin_read on audit_log
  for select using (is_admin());

drop policy if exists audit_log_authenticated_insert on audit_log;
create policy audit_log_authenticated_insert on audit_log
  for insert with check (
    auth.uid() is not null and actor = auth.uid()
  );

-- Canjea una invitación después de crear la cuenta con Supabase Auth.
-- La operación bloquea la invitación para evitar doble uso concurrente.
create or replace function claim_invitation(
  p_code text,
  p_display_name text,
  p_email text
)
returns table (role user_role, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row invitations;
  authenticated_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if length(trim(p_display_name)) < 2 or length(trim(p_display_name)) > 100 then
    raise exception 'invalid_display_name';
  end if;

  if lower(trim(p_email)) <> authenticated_email then
    raise exception 'email_mismatch';
  end if;

  select *
    into invitation_row
    from invitations
   where upper(code) = upper(trim(p_code))
     and lower(email) = authenticated_email
     and status = 'pending'
   for update;

  if not found then
    raise exception 'invitation_invalid_or_used';
  end if;

  update invitations
     set status = 'accepted'
   where id = invitation_row.id;

  insert into profiles (id, display_name, role)
  values (auth.uid(), trim(p_display_name), invitation_row.role)
  on conflict (id) do update
    set display_name = excluded.display_name,
        role = excluded.role;

  return query select invitation_row.role, trim(p_display_name);
end;
$$;

revoke all on function claim_invitation(text, text, text) from public;
grant execute on function claim_invitation(text, text, text) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000006_consolidate_rls_policies.sql

-- ---------------------------------------------------------------------

-- Keep read access and mutation access as separate, non-overlapping policies.
-- This preserves the existing tournament-scoped authorization rules while
-- avoiding duplicate policy evaluation for authenticated SELECT queries.

drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_admin_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or is_admin());

drop policy if exists matches_manage on public.matches;
create policy matches_insert on public.matches
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy matches_update on public.matches
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy matches_delete on public.matches
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists tournament_finish_points_manage on public.tournament_finish_points;
create policy tournament_finish_points_insert on public.tournament_finish_points
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy tournament_finish_points_update on public.tournament_finish_points
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy tournament_finish_points_delete on public.tournament_finish_points
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists tournament_referees_manage on public.tournament_referees;
create policy tournament_referees_insert on public.tournament_referees
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy tournament_referees_update on public.tournament_referees
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy tournament_referees_delete on public.tournament_referees
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists participants_manage on public.participants;
create policy participants_insert on public.participants
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy participants_update on public.participants
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy participants_delete on public.participants
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists stages_manage on public.stages;
create policy stages_insert on public.stages
  for insert to authenticated
  with check (manages_tournament(tournament_id));
create policy stages_update on public.stages
  for update to authenticated
  using (manages_tournament(tournament_id))
  with check (manages_tournament(tournament_id));
create policy stages_delete on public.stages
  for delete to authenticated
  using (manages_tournament(tournament_id));

drop policy if exists groups_manage on public.groups;
create policy groups_insert on public.groups
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy groups_update on public.groups
  for update to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy groups_delete on public.groups
  for delete to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = groups.stage_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists group_participants_manage on public.group_participants;
create policy group_participants_insert on public.group_participants
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy group_participants_update on public.group_participants
  for update to authenticated
  using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy group_participants_delete on public.group_participants
  for delete to authenticated
  using (
    exists (
      select 1
      from public.groups g
      join public.stages s on s.id = g.stage_id
      where g.id = group_participants.group_id
        and manages_tournament(s.tournament_id)
    )
  );

drop policy if exists rounds_manage on public.rounds;
create policy rounds_insert on public.rounds
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy rounds_update on public.rounds
  for update to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  )
  with check (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );
create policy rounds_delete on public.rounds
  for delete to authenticated
  using (
    exists (
      select 1
      from public.stages s
      where s.id = rounds.stage_id
        and manages_tournament(s.tournament_id)
    )
  );




-- ---------------------------------------------------------------------

-- Migration: 20261105000007_profile_avatar.sql

-- ---------------------------------------------------------------------

-- Persist profile avatars in Supabase Storage and link them to profiles.
alter table public.profiles
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

drop policy if exists avatars_authenticated_insert on storage.objects;
create policy avatars_authenticated_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())::text
  );

create or replace function public.update_my_avatar(p_avatar_url text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if p_avatar_url is null or length(trim(p_avatar_url)) < 1 or length(trim(p_avatar_url)) > 2048 then
    raise exception 'avatar_url_invalid';
  end if;

  update public.profiles
     set avatar_url = trim(p_avatar_url)
   where id = auth.uid()
   returning * into updated_profile;

  if not found then
    raise exception 'profile_not_found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_my_avatar(text) from public;
grant execute on function public.update_my_avatar(text) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000008_rankings_import.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261105000009_rankings_policy_overlap.sql

-- ---------------------------------------------------------------------

-- Avoid overlapping SELECT policies: public reads remain separate from
-- administrator mutations.
drop policy if exists ranking_entries_admin_write on public.ranking_entries;
drop policy if exists hall_of_fame_admin_write on public.hall_of_fame_entries;

drop policy if exists ranking_entries_admin_insert on public.ranking_entries;
create policy ranking_entries_admin_insert on public.ranking_entries
  for insert to authenticated
  with check (is_admin());

drop policy if exists ranking_entries_admin_update on public.ranking_entries;
create policy ranking_entries_admin_update on public.ranking_entries
  for update to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists ranking_entries_admin_delete on public.ranking_entries;
create policy ranking_entries_admin_delete on public.ranking_entries
  for delete to authenticated
  using (is_admin());

drop policy if exists hall_of_fame_admin_insert on public.hall_of_fame_entries;
create policy hall_of_fame_admin_insert on public.hall_of_fame_entries
  for insert to authenticated
  with check (is_admin());

drop policy if exists hall_of_fame_admin_update on public.hall_of_fame_entries;
create policy hall_of_fame_admin_update on public.hall_of_fame_entries
  for update to authenticated
  using (is_admin())
  with check (is_admin());

drop policy if exists hall_of_fame_admin_delete on public.hall_of_fame_entries;
create policy hall_of_fame_admin_delete on public.hall_of_fame_entries
  for delete to authenticated
  using (is_admin());




-- ---------------------------------------------------------------------

-- Migration: 20261105000010_restore_rls_helper_execution.sql

-- ---------------------------------------------------------------------

-- RLS policies invoke these SECURITY DEFINER helpers as the authenticated
-- caller. Keep them unavailable to anonymous/public callers while preserving
-- the EXECUTE privilege required for policy evaluation.
grant execute on function public.can_read_tournament(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_organizer() to authenticated;
grant execute on function public.manages_tournament(uuid) to authenticated;
grant execute on function public.referees_match(uuid) to authenticated;

revoke execute on function public.can_read_tournament(uuid) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_organizer() from public, anon;
revoke execute on function public.manages_tournament(uuid) from public, anon;
revoke execute on function public.referees_match(uuid) from public, anon;




-- ---------------------------------------------------------------------

-- Migration: 20261105000011_restrict_internal_rpc.sql

-- ---------------------------------------------------------------------

-- Authorization helpers are called by RLS policies and SECURITY DEFINER
-- functions; they are not part of the anonymous client RPC surface. PostgreSQL
-- checks EXECUTE privileges when evaluating an RLS policy, so authenticated
-- must retain EXECUTE even though these helpers are not intended as API RPCs.
revoke all on function public.can_read_tournament(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_organizer() from public, anon;
revoke all on function public.manages_tournament(uuid) from public, anon;
revoke all on function public.referees_match(uuid) from public, anon;

grant execute on function public.can_read_tournament(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_organizer() to authenticated;
grant execute on function public.manages_tournament(uuid) to authenticated;
grant execute on function public.referees_match(uuid) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000012_admin_users_audit_log.sql

-- ---------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('insert', 'update', 'delete', 'reopen', 'undo')),
  actor uuid references auth.users(id) on delete set null,
  old_data jsonb,
  new_data jsonb,
  note text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_admin_read on public.audit_logs;
create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (is_admin());

create or replace function public.list_admin_profiles()
returns table (
  id uuid,
  display_name text,
  email text,
  role user_role,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select p.id, p.display_name, u.email, p.role, p.avatar_url, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
   order by p.created_at desc;
end;
$$;

revoke all on function public.list_admin_profiles() from public, anon;
grant execute on function public.list_admin_profiles() to authenticated;

create or replace function public.record_audit_log(
  p_table_name text,
  p_record_id text,
  p_action text,
  p_note text default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.audit_logs;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.audit_logs (
    table_name, record_id, action, actor, note, old_data, new_data
  ) values (
    p_table_name, p_record_id, p_action, auth.uid(), p_note, p_old_data, p_new_data
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.record_audit_log(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.record_audit_log(text, text, text, text, jsonb, jsonb) to authenticated;

create or replace function public.list_admin_audit_logs()
returns setof public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select *
    from public.audit_logs
   order by created_at desc
   limit 500;
end;
$$;

revoke all on function public.list_admin_audit_logs() from public, anon;
grant execute on function public.list_admin_audit_logs() to authenticated;

-- Record the automatic activation of an invited profile for the admin audit trail.
create or replace function public.handle_new_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations;
  profile_name text;
begin
  select *
    into invitation_row
    from public.invitations
   where status = 'pending'
     and lower(email) = lower(new.email)
     and upper(code) = upper(coalesce(new.raw_user_meta_data ->> 'invitation_code', ''))
   order by created_at asc
   limit 1
   for update;

  if found then
    profile_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
    if length(profile_name) < 2 then
      profile_name := 'Usuario';
    end if;

    insert into public.profiles (id, display_name, role)
    values (new.id, profile_name, invitation_row.role)
    on conflict (id) do update
      set display_name = excluded.display_name,
          role = excluded.role;

    update public.invitations
       set status = 'accepted'
     where id = invitation_row.id;

    insert into public.audit_logs (table_name, record_id, action, actor, note, new_data)
    values (
      'profiles',
      new.id::text,
      'insert',
      new.id,
      format('Perfil de torneo activado automáticamente como %s.', invitation_row.role),
      jsonb_build_object('role', invitation_row.role, 'email', new.email)
    );
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_invited_user() from public, anon, authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000013_admin_users_profile_avatar_compat.sql

-- ---------------------------------------------------------------------

-- Ensure the profile column required by the admin user listing exists.
-- Some deployments applied the admin listing function before the avatar
-- profile migration, which made the function fail for every admin.
alter table public.profiles
  add column if not exists avatar_url text;




-- ---------------------------------------------------------------------

-- Migration: 20261105000014_delete_tournament_rpc.sql

-- ---------------------------------------------------------------------

-- Delete a tournament and its relational tree atomically.
-- Child tables reference the tournament hierarchy with ON DELETE CASCADE.
create or replace function public.delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_organizer uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select organizer_id
    into tournament_organizer
    from public.tournaments
   where id = p_tournament_id
   for update;

  if not found then
    raise exception 'tournament_not_found';
  end if;

  if not (public.is_admin() or tournament_organizer = auth.uid()) then
    raise exception 'forbidden';
  end if;

  delete from public.tournaments
   where id = p_tournament_id;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public, anon;
grant execute on function public.delete_tournament(uuid) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000015_invitation_admin_rpc.sql

-- ---------------------------------------------------------------------

-- Create invitations through a server-side admin RPC.
-- This avoids relying on client-provided invited_by values and centralizes
-- the authorization check used by the invitations UI.

create or replace function public.create_invitation(
  p_id text,
  p_email text,
  p_role user_role,
  p_tournament_id text default null,
  p_code text default null,
  p_created_at timestamptz default now()
)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.invitations;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  if not is_admin() then
    raise exception 'forbidden';
  end if;

  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'invitation_code_required';
  end if;

  insert into public.invitations (
    id,
    email,
    role,
    tournament_id,
    status,
    invited_by,
    code,
    created_at
  ) values (
    p_id,
    lower(trim(p_email)),
    p_role,
    p_tournament_id,
    'pending',
    auth.uid()::text,
    upper(trim(p_code)),
    coalesce(p_created_at, now())
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.create_invitation(text, text, user_role, text, text, timestamptz)
  from public, anon;
grant execute on function public.create_invitation(text, text, user_role, text, text, timestamptz)
  to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000016_invitation_profile_activation.sql

-- ---------------------------------------------------------------------

-- Create tournament profiles as soon as an invited Auth user is created.
-- The invitation code and display name are supplied as Auth user metadata by the app.
create or replace function public.handle_new_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations;
  profile_name text;
begin
  select *
    into invitation_row
    from public.invitations
   where status = 'pending'
     and lower(email) = lower(new.email)
     and upper(code) = upper(coalesce(new.raw_user_meta_data ->> 'invitation_code', ''))
   order by created_at asc
   limit 1
   for update;

  if found then
    profile_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
    if length(profile_name) < 2 then
      profile_name := 'Usuario';
    end if;

    insert into public.profiles (id, display_name, role)
    values (new.id, profile_name, invitation_row.role)
    on conflict (id) do update
      set display_name = excluded.display_name,
          role = excluded.role;

    update public.invitations
       set status = 'accepted'
     where id = invitation_row.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_invitation_profile on auth.users;
create trigger on_auth_user_created_invitation_profile
  after insert on auth.users
  for each row execute function public.handle_new_invited_user();

revoke all on function public.handle_new_invited_user() from public, anon, authenticated;

-- Draws are valid arbitration events and must not turn either score into NULL.
create or replace function public.record_battle(
  p_match uuid,
  p_scorer uuid,
  p_finish finish_type,
  p_expected_version int
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  s stages;
  t tournaments;
  r rounds;
  pts int := 0;
  need int;
  target_points int;
  scorer_is_p1 boolean;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match) or manages_tournament(m.tournament_id)) then raise exception 'forbidden'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if (p_scorer is null) <> (p_finish is null) then raise exception 'invalid_draw'; end if;
  if p_scorer is not null and p_scorer not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_scorer';
  end if;

  select * into s from stages where id = m.stage_id;
  select * into t from tournaments where id = m.tournament_id;
  select * into r from rounds where id = m.round_id;

  if p_finish is not null then
    select coalesce(points, 0) into pts
      from tournament_finish_points
     where tournament_id = m.tournament_id
       and finish = p_finish;
  end if;

  target_points := case
    when lower(coalesce(r.name, '')) = 'gran final' or r.bracket::text = 'grand_final'
      then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination')
      then t.points_to_win_playoffs
    when s.type::text = 'group_stage'
      then t.points_to_win_group
    else s.points_to_win
  end;

  scorer_is_p1 := p_scorer = m.participant1_id;

  insert into battles (match_id, battle_number, set_number, scorer_id, finish, points, recorded_by)
  values (
    p_match,
    (select coalesce(max(battle_number), 0) + 1 from battles where match_id = p_match),
    m.sets1 + m.sets2 + 1,
    p_scorer,
    p_finish,
    pts,
    auth.uid()
  );

  if p_scorer is not null then
    if scorer_is_p1 then m.score1 := m.score1 + pts; else m.score2 := m.score2 + pts; end if;
    if greatest(m.score1, m.score2) >= target_points then
      if scorer_is_p1 then m.sets1 := m.sets1 + 1; else m.sets2 := m.sets2 + 1; end if;
      need := floor(s.best_of / 2) + 1;
      if m.sets1 >= need or m.sets2 >= need then
        m.status := 'completed';
        m.winner_id := case when m.sets1 >= need then m.participant1_id else m.participant2_id end;
        m.finished_at := now();
      else
        m.score1 := 0;
        m.score2 := 0;
      end if;
    end if;
  end if;

  m.status := case when m.status = 'completed' then 'completed' else 'in_progress' end;
  update matches set
    score1 = m.score1,
    score2 = m.score2,
    sets1 = m.sets1,
    sets2 = m.sets2,
    status = m.status,
    winner_id = m.winner_id,
    finished_at = m.finished_at,
    started_at = coalesce(started_at, now()),
    version = version + 1
  where id = p_match
  returning * into m;

  return m;
end;
$$;

revoke all on function public.record_battle(uuid, uuid, finish_type, integer) from public, anon, authenticated;
grant execute on function public.record_battle(uuid, uuid, finish_type, integer) to authenticated;

-- Derive foul points on the server and update the match atomically.
create or replace function public.record_penalty(
  p_match_id uuid,
  p_offender_id uuid,
  p_card card_type,
  p_is_foul boolean,
  p_points_awarded int,
  p_awarded_to uuid,
  p_reason text,
  p_issued_by uuid,
  p_expected_version int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  t tournaments;
  s stages;
  r rounds;
  rival_id uuid;
  fouls_count int := 0;
  awarded_points int := 0;
  target_points int;
  sets_needed int;
  new_penalty_id uuid;
begin
  if p_issued_by <> auth.uid() then raise exception 'issuer_mismatch'; end if;

  select * into m from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if p_offender_id not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_offender';
  end if;

  rival_id := case when p_offender_id = m.participant1_id
    then m.participant2_id else m.participant1_id end;

  select * into t from tournaments where id = m.tournament_id;
  select * into s from stages where id = m.stage_id;
  select * into r from rounds where id = m.round_id;

  if p_is_foul then
    select count(*) + 1
      into fouls_count
      from penalties
     where match_id = p_match_id
       and participant_id = p_offender_id
       and is_foul;

    if fouls_count % greatest(t.fouls_per_point, 1) = 0 then
      awarded_points := t.foul_points;
    end if;
  end if;

  target_points := case
    when lower(coalesce(r.name, '')) = 'gran final' or r.bracket::text = 'grand_final'
      then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination')
      then t.points_to_win_playoffs
    when s.type::text = 'group_stage'
      then t.points_to_win_group
    else s.points_to_win
  end;

  insert into penalties (
    match_id, participant_id, card, is_foul, points_awarded, awarded_to, reason, issued_by, created_at
  ) values (
    p_match_id, p_offender_id, p_card, p_is_foul, awarded_points,
    case when awarded_points > 0 then rival_id else null end,
    p_reason, auth.uid(), now()
  ) returning id into new_penalty_id;

  if awarded_points > 0 then
    if rival_id = m.participant1_id then m.score1 := m.score1 + awarded_points;
    else m.score2 := m.score2 + awarded_points;
    end if;

    if greatest(m.score1, m.score2) >= target_points then
      if rival_id = m.participant1_id then m.sets1 := m.sets1 + 1;
      else m.sets2 := m.sets2 + 1;
      end if;
      sets_needed := floor(s.best_of / 2) + 1;
      if m.sets1 >= sets_needed or m.sets2 >= sets_needed then
        m.status := 'completed';
        m.winner_id := case when m.sets1 >= sets_needed
          then m.participant1_id else m.participant2_id end;
        m.finished_at := now();
      else
        m.score1 := 0;
        m.score2 := 0;
      end if;
    end if;
  end if;

  m.status := case when m.status = 'completed' then 'completed' else 'in_progress' end;
  update matches set
    score1 = m.score1,
    score2 = m.score2,
    sets1 = m.sets1,
    sets2 = m.sets2,
    status = m.status,
    winner_id = m.winner_id,
    finished_at = m.finished_at,
    started_at = coalesce(started_at, now()),
    version = version + 1
  where id = p_match_id;

  return jsonb_build_object(
    'success', true,
    'penalty_id', new_penalty_id,
    'points_awarded', awarded_points,
    'awarded_to', case when awarded_points > 0 then rival_id else null end,
    'new_version', m.version + 1
  );
end;
$$;

revoke all on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
  to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000017_match_target_points.sql

-- ---------------------------------------------------------------------

-- Use the configured target for the current phase and reserve the final target
-- for the actual Grand Final round.
create or replace function public.record_battle(
  p_match uuid,
  p_scorer uuid,
  p_finish finish_type,
  p_expected_version int
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  s stages;
  t tournaments;
  r rounds;
  pts int;
  need int;
  target_points int;
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
  select * into t from tournaments where id = m.tournament_id;
  select * into r from rounds where id = m.round_id;
  select points into pts
    from tournament_finish_points
   where tournament_id = m.tournament_id
     and finish = p_finish;

  target_points := case
    when lower(coalesce(r.name, '')) = 'gran final' or r.bracket::text = 'grand_final'
      then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination')
      then t.points_to_win_playoffs
    when s.type::text = 'group_stage'
      then t.points_to_win_group
    else s.points_to_win
  end;

  scorer_is_p1 := (p_scorer = m.participant1_id);

  insert into battles (match_id, battle_number, set_number, scorer_id, finish, points, recorded_by)
  values (p_match, (select coalesce(max(battle_number), 0) + 1 from battles where match_id = p_match),
          m.sets1 + m.sets2 + 1, p_scorer, p_finish, pts, auth.uid());

  if scorer_is_p1 then m.score1 := m.score1 + pts; else m.score2 := m.score2 + pts; end if;
  m.status := 'in_progress';

  if greatest(m.score1, m.score2) >= target_points then
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
end
$$;




-- ---------------------------------------------------------------------

-- Migration: 20261105000018_publish_tournament_rpc.sql

-- ---------------------------------------------------------------------

-- Publish the tournament root row through one authorized operation.
-- This avoids client-side upsert/RLS inconsistencies during first creation.
create or replace function public.publish_tournament(
  p_id uuid,
  p_slug text,
  p_name text,
  p_description text,
  p_organizer_id uuid,
  p_status tournament_status,
  p_is_public boolean,
  p_max_participants integer,
  p_check_in_required boolean,
  p_entry_fee numeric,
  p_foul_points integer,
  p_fouls_per_point integer,
  p_points_to_win_group integer,
  p_points_to_win_playoffs integer,
  p_points_to_win_final integer,
  p_venue_name text,
  p_venue_address text,
  p_country text,
  p_starts_at timestamptz,
  p_created_at timestamptz
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_organizer_id uuid;
  v_organizer_id uuid;
  v_result public.tournaments;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = v_user_id
      and role in ('admin', 'organizer')
  ) then
    raise exception 'TOURNAMENT_PUBLISH_ROLE_REQUIRED';
  end if;

  select organizer_id
    into v_existing_organizer_id
  from public.tournaments
  where id = p_id;

  if v_existing_organizer_id is not null
     and v_existing_organizer_id <> v_user_id
     and not is_admin() then
    raise exception 'TOURNAMENT_OWNER_REQUIRED';
  end if;

  v_organizer_id := case
    when is_admin() then coalesce(p_organizer_id, v_user_id)
    else v_user_id
  end;

  insert into public.tournaments (
    id,
    slug,
    name,
    description,
    organizer_id,
    status,
    is_public,
    max_participants,
    check_in_required,
    entry_fee,
    foul_points,
    fouls_per_point,
    points_to_win_group,
    points_to_win_playoffs,
    points_to_win_final,
    venue_name,
    venue_address,
    country,
    starts_at,
    created_at
  )
  values (
    p_id,
    p_slug,
    p_name,
    p_description,
    v_organizer_id,
    p_status,
    p_is_public,
    p_max_participants,
    p_check_in_required,
    p_entry_fee,
    p_foul_points,
    p_fouls_per_point,
    p_points_to_win_group,
    p_points_to_win_playoffs,
    p_points_to_win_final,
    p_venue_name,
    p_venue_address,
    p_country,
    p_starts_at,
    coalesce(p_created_at, now())
  )
  on conflict (id) do update set
    slug = excluded.slug,
    name = excluded.name,
    description = excluded.description,
    organizer_id = excluded.organizer_id,
    status = excluded.status,
    is_public = excluded.is_public,
    max_participants = excluded.max_participants,
    check_in_required = excluded.check_in_required,
    entry_fee = excluded.entry_fee,
    foul_points = excluded.foul_points,
    fouls_per_point = excluded.fouls_per_point,
    points_to_win_group = excluded.points_to_win_group,
    points_to_win_playoffs = excluded.points_to_win_playoffs,
    points_to_win_final = excluded.points_to_win_final,
    venue_name = excluded.venue_name,
    venue_address = excluded.venue_address,
    country = excluded.country,
    starts_at = excluded.starts_at
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.publish_tournament(
  uuid, text, text, text, uuid, tournament_status, boolean, integer,
  boolean, numeric, integer, integer, integer, integer, integer, text,
  text, text, timestamptz, timestamptz
) from public, anon;
grant execute on function public.publish_tournament(
  uuid, text, text, text, uuid, tournament_status, boolean, integer,
  boolean, numeric, integer, integer, integer, integer, integer, text,
  text, text, timestamptz, timestamptz
) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000019_realtime_tournament_tables.sql

-- ---------------------------------------------------------------------

-- Publish every tournament-domain table needed by live multi-user views.
-- The catalog check keeps this migration safe when a table is already enabled.

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tournaments',
    'tournament_finish_points',
    'tournament_referees',
    'participants',
    'stages',
    'groups',
    'group_participants',
    'rounds',
    'matches',
    'battles',
    'penalties'
  ] loop
    if not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;




-- ---------------------------------------------------------------------

-- Migration: 20261105000020_restrict_public_domain_grants.sql

-- ---------------------------------------------------------------------

-- Keep public reads available while preventing direct anonymous writes.
-- RLS remains the authorization boundary for authenticated mutations.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tournaments',
    'tournament_finish_points',
    'tournament_referees',
    'participants',
    'stages',
    'groups',
    'group_participants',
    'rounds',
    'matches',
    'battles',
    'penalties'
  ] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', table_name);
    execute format('grant select on public.%I to anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end
$$;




-- ---------------------------------------------------------------------

-- Migration: 20261105000021_role_update_and_realtime.sql

-- ---------------------------------------------------------------------

-- Persist administrator role changes and publish profile updates to clients.
create or replace function public.update_profile_role(
  p_user_id uuid,
  p_role user_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  update public.profiles
     set role = p_role
   where id = p_user_id
   returning * into result;

  if result.id is null then
    raise exception 'profile_not_found';
  end if;

  return result;
end;
$$;

revoke all on function public.update_profile_role(uuid, user_role) from public, anon;
grant execute on function public.update_profile_role(uuid, user_role) to authenticated;

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;

-- Admins may recover/synchronize tournaments created by another organizer.
-- Organizers remain restricted to tournaments owned by their own profile.
drop policy if exists tournaments_insert on public.tournaments;
create policy tournaments_insert on public.tournaments
  for insert to authenticated
  with check (
    is_admin()
    or (is_organizer() and organizer_id = (select auth.uid()))
  );




-- ---------------------------------------------------------------------

-- Migration: 20261105000022_tournament_deletion_tombstones.sql

-- ---------------------------------------------------------------------

-- Prevent stale clients from recreating a tournament after it was deleted.
create table if not exists public.deleted_tournaments (
  id uuid primary key,
  deleted_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id) on delete set null
);

alter table public.deleted_tournaments enable row level security;

revoke all on public.deleted_tournaments from public, anon, authenticated;

create or replace function public.delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_organizer uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select organizer_id
    into tournament_organizer
    from public.tournaments
   where id = p_tournament_id
   for update;

  if not found then
    raise exception 'tournament_not_found';
  end if;

  if not (public.is_admin() or tournament_organizer = auth.uid()) then
    raise exception 'forbidden';
  end if;

  insert into public.deleted_tournaments (id, deleted_by)
  values (p_tournament_id, auth.uid())
  on conflict (id) do update
    set deleted_at = now(), deleted_by = excluded.deleted_by;

  delete from public.tournaments
   where id = p_tournament_id;
end;
$$;

create or replace function public.publish_tournament(
  p_id uuid,
  p_slug text,
  p_name text,
  p_description text,
  p_organizer_id uuid,
  p_status tournament_status,
  p_is_public boolean,
  p_max_participants integer,
  p_check_in_required boolean,
  p_entry_fee numeric,
  p_foul_points integer,
  p_fouls_per_point integer,
  p_points_to_win_group integer,
  p_points_to_win_playoffs integer,
  p_points_to_win_final integer,
  p_venue_name text,
  p_venue_address text,
  p_country text,
  p_starts_at timestamptz,
  p_created_at timestamptz
)
returns public.tournaments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_organizer_id uuid;
  v_organizer_id uuid;
  v_result public.tournaments;
begin
  if v_user_id is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from public.deleted_tournaments where id = p_id) then
    raise exception 'TOURNAMENT_DELETED';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role in ('admin', 'organizer')
  ) then raise exception 'TOURNAMENT_PUBLISH_ROLE_REQUIRED'; end if;

  select organizer_id into v_existing_organizer_id
    from public.tournaments where id = p_id;
  if v_existing_organizer_id is not null
     and v_existing_organizer_id <> v_user_id
     and not public.is_admin() then
    raise exception 'TOURNAMENT_OWNER_REQUIRED';
  end if;

  v_organizer_id := case
    when public.is_admin() then coalesce(p_organizer_id, v_user_id)
    else v_user_id
  end;

  insert into public.tournaments (
    id, slug, name, description, organizer_id, status, is_public,
    max_participants, check_in_required, entry_fee, foul_points,
    fouls_per_point, points_to_win_group, points_to_win_playoffs,
    points_to_win_final, venue_name, venue_address, country, starts_at, created_at
  )
  values (
    p_id, p_slug, p_name, p_description, v_organizer_id, p_status, p_is_public,
    p_max_participants, p_check_in_required, p_entry_fee, p_foul_points,
    p_fouls_per_point, p_points_to_win_group, p_points_to_win_playoffs,
    p_points_to_win_final, p_venue_name, p_venue_address, p_country,
    p_starts_at, coalesce(p_created_at, now())
  )
  on conflict (id) do update set
    slug = excluded.slug, name = excluded.name, description = excluded.description,
    organizer_id = excluded.organizer_id, status = excluded.status,
    is_public = excluded.is_public, max_participants = excluded.max_participants,
    check_in_required = excluded.check_in_required, entry_fee = excluded.entry_fee,
    foul_points = excluded.foul_points, fouls_per_point = excluded.fouls_per_point,
    points_to_win_group = excluded.points_to_win_group,
    points_to_win_playoffs = excluded.points_to_win_playoffs,
    points_to_win_final = excluded.points_to_win_final,
    venue_name = excluded.venue_name, venue_address = excluded.venue_address,
    country = excluded.country, starts_at = excluded.starts_at
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public, anon;
grant execute on function public.delete_tournament(uuid) to authenticated;
revoke all on function public.publish_tournament(
  uuid, text, text, text, uuid, tournament_status, boolean, integer,
  boolean, numeric, integer, integer, integer, integer, integer, text,
  text, text, timestamptz, timestamptz
) from public, anon;
grant execute on function public.publish_tournament(
  uuid, text, text, text, uuid, tournament_status, boolean, integer,
  boolean, numeric, integer, integer, integer, integer, integer, text,
  text, text, timestamptz, timestamptz
) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000023_audit_hardening.sql

-- ---------------------------------------------------------------------

-- Production audit hardening: public visibility, tournament lifecycle guards,
-- and the server-side handoff of completed matches.

alter table public.tournaments
  alter column is_public set default false;

update public.tournaments
   set is_public = false
 where status = 'draft' and is_public;

create or replace function public.can_read_tournament(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.tournaments
     where id = t
       and (
         (is_public and status <> 'draft')
         or manages_tournament(t)
         or exists (
           select 1
             from public.tournament_referees r
            where r.tournament_id = t
              and r.profile_id = (select auth.uid())
         )
       )
  );
$$;

grant execute on function public.can_read_tournament(uuid) to anon, authenticated;

create or replace function public.record_battle(
  p_match uuid,
  p_scorer uuid,
  p_finish finish_type,
  p_expected_version int
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  s stages;
  t tournaments;
  r rounds;
  pts int := 0;
  need int;
  target_points int;
  scorer_is_p1 boolean;
  loser_id uuid;
  next_match matches;
begin
  select * into m from public.matches where id = p_match for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match) or manages_tournament(m.tournament_id)) then raise exception 'forbidden'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'in_progress' or s.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if (p_scorer is null) <> (p_finish is null) then raise exception 'invalid_draw'; end if;
  if p_scorer is not null and p_scorer not in (m.participant1_id, m.participant2_id) then raise exception 'invalid_scorer'; end if;
  select * into r from public.rounds where id = m.round_id;
  if p_finish is not null then
    select coalesce(points, 0) into pts
      from public.tournament_finish_points
     where tournament_id = m.tournament_id and finish = p_finish;
  end if;
  target_points := case
    when r.bracket::text = 'grand_final' or lower(coalesce(r.name, '')) = 'gran final' then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type::text = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;
  scorer_is_p1 := p_scorer = m.participant1_id;
  insert into public.battles (match_id, battle_number, set_number, scorer_id, finish, points, recorded_by)
  values (p_match, (select coalesce(max(battle_number), 0) + 1 from public.battles where match_id = p_match),
          m.sets1 + m.sets2 + 1, p_scorer, p_finish, pts, auth.uid());
  if p_scorer is not null then
    if scorer_is_p1 then m.score1 := m.score1 + pts; else m.score2 := m.score2 + pts; end if;
    if greatest(m.score1, m.score2) >= target_points then
      if scorer_is_p1 then m.sets1 := m.sets1 + 1; else m.sets2 := m.sets2 + 1; end if;
      need := floor(s.best_of / 2) + 1;
      if m.sets1 >= need or m.sets2 >= need then
        m.status := 'completed';
        m.winner_id := case when m.sets1 >= need then m.participant1_id else m.participant2_id end;
        m.finished_at := now();
      else
        m.score1 := 0; m.score2 := 0;
      end if;
    end if;
  end if;
  m.status := case when m.status = 'completed' then 'completed' else 'in_progress' end;
  update public.matches set score1 = m.score1, score2 = m.score2, sets1 = m.sets1, sets2 = m.sets2,
    status = m.status, winner_id = m.winner_id, finished_at = m.finished_at,
    started_at = coalesce(started_at, now()), version = version + 1
    where id = p_match returning * into m;

  if m.status = 'completed' and m.winner_id is not null then
    loser_id := case when m.winner_id = m.participant1_id then m.participant2_id else m.participant1_id end;
    if m.next_match_winner_id is not null then
      update public.matches
         set participant1_id = case when participant1_id is null then m.winner_id else participant1_id end,
             participant2_id = case when participant1_id is not null and participant2_id is null then m.winner_id else participant2_id end,
             version = version + 1
       where id = m.next_match_winner_id;
    end if;
    if m.next_match_loser_id is not null and loser_id is not null then
      update public.matches
         set participant1_id = case when participant1_id is null then loser_id else participant1_id end,
             participant2_id = case when participant1_id is not null and participant2_id is null then loser_id else participant2_id end,
             version = version + 1
       where id = m.next_match_loser_id;
    end if;
  end if;

  update public.stages
     set status = 'completed'
   where id = m.stage_id
     and not exists (
       select 1 from public.matches
        where stage_id = m.stage_id
          and status <> 'completed'
     );

  update public.tournaments
     set status = 'completed'
   where id = m.tournament_id
     and not exists (
       select 1
         from public.stages
        where tournament_id = m.tournament_id
          and status <> 'completed'
     );

  return m;
end;
$$;

grant execute on function public.record_battle(uuid, uuid, finish_type, integer) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000024_audit_followup.sql

-- ---------------------------------------------------------------------

-- Follow-up hardening for invitations, manual series corrections and replayable
-- Swiss rounds. This migration is safe to apply after the audit migrations.

create extension if not exists pgcrypto;

alter table public.invitations
  add column if not exists expires_at timestamptz;

update public.invitations
   set expires_at = created_at + interval '7 days'
 where expires_at is null;

alter table public.invitations
  alter column expires_at set default (now() + interval '7 days');

alter table public.invitations
  alter column expires_at set not null;

create or replace function public.create_invitation(
  p_id text,
  p_email text,
  p_role user_role,
  p_tournament_id text default null,
  p_code text default null,
  p_created_at timestamptz default now()
)
returns public.invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.invitations;
  generated_code text;
begin
  if auth.uid() is null or not is_admin() then
    raise exception 'forbidden';
  end if;

  loop
    generated_code := 'BEY-' || upper(substr(p_role::text, 1, 3)) || '-' ||
      upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1 from public.invitations where code = generated_code
    );
  end loop;

  insert into public.invitations (
    id, email, role, tournament_id, status, invited_by, code, created_at, expires_at
  ) values (
    p_id,
    lower(trim(p_email)),
    p_role,
    p_tournament_id,
    'pending',
    auth.uid()::text,
    generated_code,
    coalesce(p_created_at, now()),
    coalesce(p_created_at, now()) + interval '7 days'
  )
  returning * into result;

  return result;
end;
$$;

revoke all on function public.create_invitation(text, text, user_role, text, text, timestamptz)
  from public, anon;
grant execute on function public.create_invitation(text, text, user_role, text, text, timestamptz)
  to authenticated;

create or replace function public.claim_invitation(
  p_code text,
  p_display_name text,
  p_email text
)
returns table (role user_role, display_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations;
  authenticated_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  existing_role user_role;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if length(trim(p_display_name)) < 2 or length(trim(p_display_name)) > 100 then
    raise exception 'invalid_display_name';
  end if;
  if lower(trim(p_email)) <> authenticated_email then raise exception 'email_mismatch'; end if;

  select * into invitation_row
    from public.invitations
   where upper(code) = upper(trim(p_code))
     and lower(email) = authenticated_email
     and status = 'pending'
     and expires_at > now()
   for update;

  if not found then raise exception 'invitation_invalid_or_expired'; end if;

  select profiles.role into existing_role
    from public.profiles
   where id = auth.uid();

  if existing_role is not null and existing_role not in ('public', invitation_row.role) then
    raise exception 'role_escalation_or_downgrade_denied';
  end if;

  insert into public.profiles (id, display_name, role)
  values (auth.uid(), trim(p_display_name), coalesce(existing_role, invitation_row.role))
  on conflict (id) do update
    set display_name = excluded.display_name;

  if invitation_row.role = 'referee' and invitation_row.tournament_id is not null then
    insert into public.tournament_referees (tournament_id, profile_id)
    values (invitation_row.tournament_id::uuid, auth.uid())
    on conflict do nothing;
  end if;

  update public.invitations set status = 'accepted' where id = invitation_row.id;
  return query select coalesce(existing_role, invitation_row.role), trim(p_display_name);
end;
$$;

revoke all on function public.claim_invitation(text, text, text) from public, anon;
grant execute on function public.claim_invitation(text, text, text) to authenticated;

create or replace function public.handle_new_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.invitations;
  existing_role user_role;
  profile_name text;
begin
  select * into invitation_row
    from public.invitations
   where status = 'pending'
     and lower(email) = lower(new.email)
     and upper(code) = upper(coalesce(new.raw_user_meta_data ->> 'invitation_code', ''))
     and expires_at > now()
   order by created_at asc
   limit 1
   for update;

  if not found then return new; end if;

  select role into existing_role from public.profiles where id = new.id;
  profile_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', 'Usuario'));
  if length(profile_name) < 2 then profile_name := 'Usuario'; end if;

  insert into public.profiles (id, display_name, role)
  values (new.id, profile_name, coalesce(existing_role, invitation_row.role))
  on conflict (id) do update
    set display_name = excluded.display_name;

  if invitation_row.role = 'referee' and invitation_row.tournament_id is not null then
    insert into public.tournament_referees (tournament_id, profile_id)
    values (invitation_row.tournament_id::uuid, new.id)
    on conflict do nothing;
  end if;

  update public.invitations set status = 'accepted' where id = invitation_row.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_invitation_profile on auth.users;
create trigger on_auth_user_created_invitation_profile
  after insert on auth.users
  for each row execute function public.handle_new_invited_user();

revoke all on function public.handle_new_invited_user() from public, anon, authenticated;

create or replace function public.adjust_manual_set(
  p_match_id uuid,
  p_participant_id uuid,
  p_delta int,
  p_expected_version int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  sets_needed int;
  previous_winner uuid;
  next_winner uuid;
  next_loser uuid;
begin
  if p_delta not in (-1, 1) then raise exception 'invalid_set_delta'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'in_progress' or s.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;
  if p_participant_id not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_participant';
  end if;
  if p_delta > 0 and m.status = 'completed' then raise exception 'match_closed'; end if;

  if p_participant_id = m.participant1_id then
    m.sets1 := greatest(0, m.sets1 + p_delta);
  else
    m.sets2 := greatest(0, m.sets2 + p_delta);
  end if;

  sets_needed := floor(s.best_of / 2) + 1;
  previous_winner := m.winner_id;
  if m.sets1 >= sets_needed or m.sets2 >= sets_needed then
    m.status := 'completed';
    m.winner_id := case when m.sets1 >= sets_needed then m.participant1_id else m.participant2_id end;
    m.finished_at := coalesce(m.finished_at, now());
  else
    m.status := case when m.sets1 > 0 or m.sets2 > 0 or m.score1 > 0 or m.score2 > 0
      then 'in_progress'::match_status else 'pending'::match_status end;
    m.winner_id := null;
    m.finished_at := null;
    if p_delta < 0 and m.next_match_winner_id is not null then
      next_winner := previous_winner;
      next_loser := case when m.participant1_id = next_winner then m.participant2_id else m.participant1_id end;
      update public.matches
         set participant1_id = case when participant1_id in (next_winner, next_loser) then null else participant1_id end,
             participant2_id = case when participant2_id in (next_winner, next_loser) then null else participant2_id end,
             version = version + 1
       where id = m.next_match_winner_id;
    end if;
  end if;

  update public.matches set
    sets1 = m.sets1, sets2 = m.sets2, status = m.status, winner_id = m.winner_id,
    finished_at = m.finished_at, version = version + 1
   where id = p_match_id
   returning * into m;
  return m;
end;
$$;

revoke all on function public.adjust_manual_set(uuid, uuid, int, int) from public, anon;
grant execute on function public.adjust_manual_set(uuid, uuid, int, int) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000025_manual_set_consistency.sql

-- ---------------------------------------------------------------------

-- Keep bracket advancement and lifecycle state consistent when a manual set
-- correction changes a completed match back to an open result.

create or replace function public.adjust_manual_set(
  p_match_id uuid,
  p_participant_id uuid,
  p_delta int,
  p_expected_version int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  sets_needed int;
  previous_winner uuid;
  previous_loser uuid;
  previous_status match_status;
  next_loser uuid;
begin
  if p_delta not in (-1, 1) then
    raise exception 'invalid_set_delta';
  end if;

  select *
    into m
    from public.matches
   where id = p_match_id
   for update;
  if not found then
    raise exception 'match_not_found';
  end if;

  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;

  if m.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;

  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status in ('cancelled', 'completed') then
    raise exception 'tournament_not_editable';
  end if;
  if s.status = 'pending' or (m.status <> 'completed' and p_delta < 0) then
    raise exception 'invalid_set_adjustment';
  end if;
  if p_participant_id not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_participant';
  end if;
  if p_delta > 0 and m.status = 'completed' then
    raise exception 'match_closed';
  end if;

  previous_status := m.status;
  previous_winner := m.winner_id;
  previous_loser := case
    when m.winner_id = m.participant1_id then m.participant2_id
    when m.winner_id = m.participant2_id then m.participant1_id
    else null
  end;

  if p_participant_id = m.participant1_id then
    m.sets1 := greatest(0, m.sets1 + p_delta);
  else
    m.sets2 := greatest(0, m.sets2 + p_delta);
  end if;

  sets_needed := floor(s.best_of / 2) + 1;
  if m.sets1 >= sets_needed or m.sets2 >= sets_needed then
    m.status := 'completed';
    m.winner_id := case
      when m.sets1 >= sets_needed then m.participant1_id
      else m.participant2_id
    end;
    m.finished_at := coalesce(m.finished_at, now());
  else
    m.status := case
      when m.sets1 > 0 or m.sets2 > 0 or m.score1 > 0 or m.score2 > 0
        then 'in_progress'::match_status
      else 'pending'::match_status
    end;
    m.winner_id := null;
    m.finished_at := null;
  end if;

  if previous_status = 'completed' and (
    m.status <> 'completed' or previous_winner is distinct from m.winner_id
  ) then
    update public.matches
       set participant1_id = case
             when participant1_id in (previous_winner, previous_loser) then null
             else participant1_id
           end,
           participant2_id = case
             when participant2_id in (previous_winner, previous_loser) then null
             else participant2_id
           end,
           version = version + 1
     where id in (m.next_match_winner_id, m.next_match_loser_id)
       and (
         participant1_id in (previous_winner, previous_loser)
         or participant2_id in (previous_winner, previous_loser)
       );
  end if;

  update public.matches
     set sets1 = m.sets1,
         sets2 = m.sets2,
         status = m.status,
         winner_id = m.winner_id,
         finished_at = m.finished_at,
         version = version + 1
   where id = p_match_id
   returning * into m;

  if m.status = 'completed' and m.winner_id is not null then
    next_loser := case
      when m.winner_id = m.participant1_id then m.participant2_id
      else m.participant1_id
    end;

    if m.next_match_winner_id is not null then
      update public.matches
         set participant1_id = case
               when participant1_id is null
                and participant2_id is distinct from m.winner_id
                 then m.winner_id
               else participant1_id
             end,
             participant2_id = case
               when participant1_id is not null
                and participant2_id is null
                and participant1_id is distinct from m.winner_id
                 then m.winner_id
               else participant2_id
             end,
             version = version + 1
       where id = m.next_match_winner_id
         and m.winner_id is distinct from participant1_id
         and m.winner_id is distinct from participant2_id;
    end if;

    if m.next_match_loser_id is not null and next_loser is not null then
      update public.matches
         set participant1_id = case
               when participant1_id is null
                and participant2_id is distinct from next_loser
                 then next_loser
               else participant1_id
             end,
             participant2_id = case
               when participant1_id is not null
                and participant2_id is null
                and participant1_id is distinct from next_loser
                 then next_loser
               else participant2_id
             end,
             version = version + 1
       where id = m.next_match_loser_id
         and next_loser is distinct from participant1_id
         and next_loser is distinct from participant2_id;
    end if;
  end if;

  if m.status <> 'completed' then
    update public.stages
       set status = 'in_progress'
     where id = m.stage_id
       and status = 'completed';
  end if;

  update public.stages
     set status = 'completed'
   where id = m.stage_id
     and not exists (
       select 1
         from public.matches
        where stage_id = m.stage_id
          and status <> 'completed'
     );

  update public.tournaments
     set status = 'in_progress'
   where id = m.tournament_id
     and status = 'completed';

  return m;
end;
$$;

revoke all on function public.adjust_manual_set(uuid, uuid, int, int) from public, anon;
grant execute on function public.adjust_manual_set(uuid, uuid, int, int) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261105000026_undo_battle_rpc.sql

-- ---------------------------------------------------------------------

-- Transactional undo for the last non-voided battle of a match.
-- Rebuilds the score from the remaining battle and penalty events so the
-- operation remains correct when the undone battle completed a set or match.

create or replace function public.undo_last_battle(
  p_match_id uuid,
  p_expected_version int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  old_winner uuid;
  old_loser uuid;
  sets_needed int;
  target_points int;
  event record;
  v_score1 int := 0;
  v_score2 int := 0;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner uuid := null;
  next_status match_status := 'pending';
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status in ('cancelled', 'completed') then raise exception 'tournament_not_editable'; end if;
  if not exists (
    select 1 from public.battles
     where match_id = p_match_id and not voided
  ) then
    raise exception 'no_battle_to_undo';
  end if;

  update public.battles
     set voided = true
   where id = (
     select id
       from public.battles
      where match_id = p_match_id and not voided
      order by created_at desc, battle_number desc
      limit 1
   );

  old_winner := m.winner_id;
  old_loser := case
    when m.winner_id = m.participant1_id then m.participant2_id
    when m.winner_id = m.participant2_id then m.participant1_id
    else null
  end;
  sets_needed := floor(s.best_of / 2) + 1;
  target_points := case
    when exists (
      select 1 from public.rounds r
       where r.id = m.round_id
         and (r.bracket::text = 'grand_final' or lower(coalesce(r.name, '')) = 'gran final')
    ) then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type::text = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  for event in
    select 'battle' as kind, b.created_at, b.scorer_id as awarded_to, b.points
      from public.battles b
     where b.match_id = p_match_id and not b.voided and b.scorer_id is not null
    union all
    select 'penalty' as kind, p.created_at, p.awarded_to, p.points_awarded
      from public.penalties p
     where p.match_id = p_match_id and p.awarded_to is not null and p.points_awarded > 0
    order by created_at
  loop
    if event.awarded_to = m.participant1_id then v_score1 := v_score1 + event.points; end if;
    if event.awarded_to = m.participant2_id then v_score2 := v_score2 + event.points; end if;
    if greatest(v_score1, v_score2) >= target_points then
      if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
      v_score1 := 0;
      v_score2 := 0;
      if v_sets1 >= sets_needed or v_sets2 >= sets_needed then
        v_winner := case when v_sets1 >= sets_needed then m.participant1_id else m.participant2_id end;
        exit;
      end if;
    end if;
  end loop;

  if v_winner is not null then
    next_status := 'completed';
  elsif v_score1 > 0 or v_score2 > 0 or v_sets1 > 0 or v_sets2 > 0 then
    next_status := 'in_progress';
  end if;

  if old_winner is not null and (v_winner is null or v_winner is distinct from old_winner) then
    update public.matches
       set participant1_id = case when participant1_id in (old_winner, old_loser) then null else participant1_id end,
           participant2_id = case when participant2_id in (old_winner, old_loser) then null else participant2_id end,
           version = version + 1
     where id in (m.next_match_winner_id, m.next_match_loser_id)
       and (participant1_id in (old_winner, old_loser) or participant2_id in (old_winner, old_loser));
  end if;

  update public.matches
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         winner_id = v_winner,
         status = next_status,
         finished_at = case when next_status = 'completed' then finished_at else null end,
         version = version + 1
   where id = p_match_id
   returning * into m;

  if next_status <> 'completed' then
    update public.stages set status = 'in_progress'
     where id = m.stage_id and status = 'completed';
  end if;
  update public.tournaments set status = 'in_progress'
   where id = m.tournament_id and status = 'completed';

  insert into public.audit_log(table_name, record_id, action, old_data, new_data, actor)
  values ('battles', p_match_id, 'undo',
          jsonb_build_object('winner_id', old_winner, 'match_version', p_expected_version),
          jsonb_build_object('winner_id', v_winner, 'match_version', m.version),
          auth.uid());
  return m;
end;
$$;

revoke all on function public.undo_last_battle(uuid, int) from public, anon;
grant execute on function public.undo_last_battle(uuid, int) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261112000001_unify_audit_log.sql

-- ---------------------------------------------------------------------

-- Consolidate the administrative audit table into the canonical audit_log.
-- Migration 20261105000012 introduced audit_logs, while all other audit
-- writes and the reference schema use audit_log.

alter table public.audit_log
  alter column record_id type text using record_id::text;

alter table public.audit_log
  add column if not exists note text;

insert into public.audit_log (
  table_name,
  record_id,
  action,
  old_data,
  new_data,
  actor,
  created_at
)
select
  table_name,
  record_id,
  action,
  old_data,
  new_data,
  actor,
  created_at
from public.audit_logs;

drop function if exists public.list_admin_audit_logs();
drop function if exists public.record_audit_log(text, text, text, text, jsonb, jsonb);

create or replace function public.record_audit_log(
  p_table_name text,
  p_record_id text,
  p_action text,
  p_note text default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null
)
returns public.audit_log
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.audit_log;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.audit_log (
    table_name, record_id, action, actor, note, old_data, new_data
  ) values (
    p_table_name, p_record_id, p_action, auth.uid(), p_note, p_old_data, p_new_data
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.list_admin_audit_logs()
returns setof public.audit_log
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  return query
  select *
    from public.audit_log
   order by created_at desc
   limit 500;
end;
$$;

revoke all on function public.record_audit_log(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.record_audit_log(text, text, text, text, jsonb, jsonb) to authenticated;
revoke all on function public.list_admin_audit_logs() from public, anon;
grant execute on function public.list_admin_audit_logs() to authenticated;

drop table public.audit_logs;

create or replace function public.handle_new_invited_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation_row public.invitations;
  profile_name text;
begin
  select *
    into invitation_row
    from public.invitations
   where status = 'pending'
     and lower(email) = lower(new.email)
     and upper(code) = upper(coalesce(new.raw_user_meta_data ->> 'invitation_code', ''))
   order by created_at asc
   limit 1
   for update;

  if found then
    profile_name := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
    if length(profile_name) < 2 then
      profile_name := 'Usuario';
    end if;

    insert into public.profiles (id, display_name, role)
    values (new.id, profile_name, invitation_row.role)
    on conflict (id) do update
      set display_name = excluded.display_name,
          role = excluded.role;

    update public.invitations
       set status = 'accepted'
     where id = invitation_row.id;

    insert into public.audit_log (table_name, record_id, action, actor, note, new_data)
    values (
      'profiles',
      new.id::text,
      'insert',
      new.id,
      format('Perfil de torneo activado automáticamente como %s.', invitation_row.role),
      jsonb_build_object('role', invitation_row.role, 'email', new.email)
    );
  end if;

  return new;
end;
$$;




-- ---------------------------------------------------------------------

-- Migration: 20261112000002_fix_tournament_delete_dependencies.sql

-- ---------------------------------------------------------------------

-- Delete tournament-owned records in dependency order.
-- This avoids participant deletion failures caused by battles.scorer_id.
create or replace function public.delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_organizer uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select organizer_id
    into tournament_organizer
    from public.tournaments
   where id = p_tournament_id
   for update;

  if not found then
    raise exception 'tournament_not_found';
  end if;

  if not (public.is_admin() or tournament_organizer = auth.uid()) then
    raise exception 'forbidden';
  end if;

  insert into public.deleted_tournaments (id, deleted_by)
  values (p_tournament_id, auth.uid())
  on conflict (id) do update
    set deleted_at = now(), deleted_by = excluded.deleted_by;

  delete from public.penalties p
   using public.matches m
   where p.match_id = m.id
     and m.tournament_id = p_tournament_id;

  delete from public.battles b
   using public.matches m
   where b.match_id = m.id
     and m.tournament_id = p_tournament_id;

  delete from public.matches
   where tournament_id = p_tournament_id;

  delete from public.participants
   where tournament_id = p_tournament_id;

  delete from public.tournaments
   where id = p_tournament_id;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public, anon;
grant execute on function public.delete_tournament(uuid) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261112000003_fix_tournament_delete_self_references.sql

-- ---------------------------------------------------------------------

-- Clear self-referencing match links before deleting tournament matches.
-- PostgreSQL otherwise rejects deletion because next_match_* still references
-- another match in the same tournament.
create or replace function public.delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_organizer uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select organizer_id
    into tournament_organizer
    from public.tournaments
   where id = p_tournament_id
   for update;

  if not found then
    raise exception 'tournament_not_found';
  end if;

  if not (public.is_admin() or tournament_organizer = auth.uid()) then
    raise exception 'forbidden';
  end if;

  insert into public.deleted_tournaments (id, deleted_by)
  values (p_tournament_id, auth.uid())
  on conflict (id) do update
    set deleted_at = now(), deleted_by = excluded.deleted_by;

  delete from public.penalties p
   using public.matches m
   where p.match_id = m.id
     and m.tournament_id = p_tournament_id;

  delete from public.battles b
   using public.matches m
   where b.match_id = m.id
     and m.tournament_id = p_tournament_id;

  update public.matches
     set next_match_winner_id = null,
         next_match_loser_id = null
   where tournament_id = p_tournament_id;

  delete from public.matches
   where tournament_id = p_tournament_id;

  delete from public.participants
   where tournament_id = p_tournament_id;

  delete from public.tournaments
   where id = p_tournament_id;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public, anon;
grant execute on function public.delete_tournament(uuid) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261116000001_publish_tournament_snapshot_rpc.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261116000002_mutation_idempotency.sql

-- ---------------------------------------------------------------------

-- Idempotency and request correlation for critical referee mutations.
-- The table is private to SECURITY DEFINER wrappers and is never exposed
-- directly through the client-facing API.
create table if not exists public.mutation_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  request_id uuid not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

alter table public.mutation_idempotency enable row level security;
revoke all on public.mutation_idempotency from public, anon, authenticated;

create index if not exists mutation_idempotency_created_at_idx
  on public.mutation_idempotency (created_at);

create or replace function public.record_battle_idempotent(
  p_match uuid,
  p_scorer uuid,
  p_finish finish_type,
  p_expected_version int,
  p_idempotency_key text,
  p_request_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_response jsonb;
  v_operation text;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  insert into public.mutation_idempotency (
    user_id, idempotency_key, operation, request_id
  )
  values (auth.uid(), p_idempotency_key, 'record_battle', p_request_id)
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  if not v_inserted then
    select operation, response
      into v_operation, v_response
      from public.mutation_idempotency
     where user_id = auth.uid()
       and idempotency_key = p_idempotency_key
     for update;
    if v_operation <> 'record_battle' then raise exception 'idempotency_key_reused'; end if;
    if v_response is null then raise exception 'idempotency_in_progress'; end if;
    return jsonb_populate_record(null::public.matches, v_response);
  end if;

  select *
    into v_match
    from public.record_battle(
      p_match, p_scorer, p_finish, p_expected_version
    );

  update public.mutation_idempotency
     set response = to_jsonb(v_match)
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key;

  return v_match;
end;
$$;

create or replace function public.record_penalty_idempotent(
  p_match_id uuid,
  p_offender_id uuid,
  p_card card_type,
  p_is_foul boolean,
  p_points_awarded int,
  p_awarded_to uuid,
  p_reason text,
  p_issued_by uuid,
  p_expected_version int,
  p_idempotency_key text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_response jsonb;
  v_result jsonb;
  v_operation text;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  insert into public.mutation_idempotency (
    user_id, idempotency_key, operation, request_id
  )
  values (auth.uid(), p_idempotency_key, 'record_penalty', p_request_id)
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  if not v_inserted then
    select operation, response
      into v_operation, v_response
      from public.mutation_idempotency
     where user_id = auth.uid()
       and idempotency_key = p_idempotency_key
     for update;
    if v_operation <> 'record_penalty' then raise exception 'idempotency_key_reused'; end if;
    if v_response is null then raise exception 'idempotency_in_progress'; end if;
    return v_response;
  end if;

  v_result := public.record_penalty(
    p_match_id, p_offender_id, p_card, p_is_foul, p_points_awarded,
    p_awarded_to, p_reason, p_issued_by, p_expected_version
  );

  update public.mutation_idempotency
     set response = v_result
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

create or replace function public.undo_last_battle_idempotent(
  p_match_id uuid,
  p_expected_version int,
  p_idempotency_key text,
  p_request_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_response jsonb;
  v_operation text;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  insert into public.mutation_idempotency (
    user_id, idempotency_key, operation, request_id
  )
  values (auth.uid(), p_idempotency_key, 'undo_last_battle', p_request_id)
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  if not v_inserted then
    select operation, response
      into v_operation, v_response
      from public.mutation_idempotency
     where user_id = auth.uid()
       and idempotency_key = p_idempotency_key
     for update;
    if v_operation <> 'undo_last_battle' then raise exception 'idempotency_key_reused'; end if;
    if v_response is null then raise exception 'idempotency_in_progress'; end if;
    return jsonb_populate_record(null::public.matches, v_response);
  end if;

  select *
    into v_match
    from public.undo_last_battle(p_match_id, p_expected_version);

  update public.mutation_idempotency
     set response = to_jsonb(v_match)
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key;

  return v_match;
end;
$$;

revoke all on function public.record_battle_idempotent(
  uuid, uuid, finish_type, integer, text, uuid
) from public, anon;
revoke all on function public.record_penalty_idempotent(
  uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer, text, uuid
) from public, anon;
revoke all on function public.undo_last_battle_idempotent(
  uuid, integer, text, uuid
) from public, anon;

grant execute on function public.record_battle_idempotent(
  uuid, uuid, finish_type, integer, text, uuid
) to authenticated;
grant execute on function public.record_penalty_idempotent(
  uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer, text, uuid
) to authenticated;
grant execute on function public.undo_last_battle_idempotent(
  uuid, integer, text, uuid
) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261116000003_double_elimination_reset.sql

-- ---------------------------------------------------------------------

-- Route double-elimination finalists deterministically and manage the
-- optional grand-final reset match without trusting client-side ordering.
create or replace function public.route_double_elimination_progression()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_bracket text;
  target_bracket text;
  reset_match public.matches;
begin
  if new.status = 'completed' and new.winner_id is not null
     and new.next_match_winner_id is not null then
    select r.bracket::text
      into source_bracket
      from public.rounds r
     where r.id = new.round_id;

    select r.bracket::text
      into target_bracket
      from public.matches m
      join public.rounds r on r.id = m.round_id
     where m.id = new.next_match_winner_id
     for update;

    if target_bracket = 'grand_final' then
      if source_bracket = 'winners' then
        update public.matches
           set participant1_id = new.winner_id,
               participant2_id = case
                 when participant1_id = new.winner_id then participant2_id
                 else participant1_id
               end,
               version = version + 1
         where id = new.next_match_winner_id;
      elsif source_bracket = 'losers' then
        update public.matches
           set participant1_id = case
                 when participant1_id = new.winner_id then null
                 else participant1_id
               end,
               participant2_id = new.winner_id,
               version = version + 1
         where id = new.next_match_winner_id;
      end if;
    end if;
  end if;

  if new.status = 'completed' and new.winner_id is not null then
    if exists (
      select 1
        from public.rounds r
       where r.id = new.round_id
         and r.bracket = 'grand_final'
    ) and new.position = 1 then
      select *
        into reset_match
        from public.matches
       where round_id = new.round_id
         and position = 2
       for update;

      if found and reset_match.status <> 'completed' then
        if new.winner_id = new.participant1_id then
          update public.matches
             set participant1_id = new.participant1_id,
                 participant2_id = new.participant2_id,
                 winner_id = new.winner_id,
                 is_bye = true,
                 status = 'completed',
                 finished_at = coalesce(new.finished_at, now()),
                 version = version + 1
           where id = reset_match.id;
        else
          update public.matches
             set participant1_id = new.participant1_id,
                 participant2_id = new.participant2_id,
                 winner_id = null,
                 is_bye = false,
                 status = 'pending',
                 finished_at = null,
                 version = version + 1
           where id = reset_match.id;
        end if;
      end if;
    end if;
  elsif old.status = 'completed' and new.status <> 'completed' then
    if exists (
      select 1
        from public.rounds r
       where r.id = new.round_id
         and r.bracket = 'grand_final'
    ) and new.position = 1 then
      update public.matches
         set participant1_id = null,
             participant2_id = null,
             winner_id = null,
             is_bye = false,
             status = 'pending',
             score1 = 0,
             score2 = 0,
             sets1 = 0,
             sets2 = 0,
             finished_at = null,
             version = version + 1
       where round_id = new.round_id
         and position = 2
         and status <> 'completed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists route_double_elimination_progression on public.matches;
create trigger route_double_elimination_progression
after update of status, winner_id, participant1_id, participant2_id
on public.matches
for each row
execute function public.route_double_elimination_progression();

revoke all on function public.route_double_elimination_progression() from public, anon, authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261116000004_standardize_audit_logs.sql

-- ---------------------------------------------------------------------

-- Keep existing installations aligned with the canonical audit_logs contract.
do $$
begin
  if to_regclass('public.audit_log') is not null
    and to_regclass('public.audit_logs') is null then
    alter table public.audit_log rename to audit_logs;
  end if;
end
$$;

drop policy if exists audit_log_admin_read on public.audit_logs;
drop policy if exists audit_log_authenticated_insert on public.audit_logs;
drop policy if exists audit_logs_admin_read on public.audit_logs;
drop policy if exists audit_logs_authenticated_insert on public.audit_logs;

alter table if exists public.audit_logs
  alter column id drop identity if exists;

alter table if exists public.audit_logs
  alter column id type uuid using gen_random_uuid(),
  alter column id set default gen_random_uuid(),
  alter column actor type text using actor::text;

do $$
begin
  if to_regclass('public.audit_logs') is not null
    and to_regclass('public.audit_log') is null then
    execute 'create view public.audit_log as select * from public.audit_logs';
  end if;
end
$$;

update public.audit_logs
   set record_id = coalesce(record_id, ''),
       actor = coalesce(actor, 'system')
 where record_id is null or actor is null;

alter table if exists public.audit_logs
  alter column record_id set not null,
  alter column actor set not null;

alter table if exists public.audit_logs enable row level security;

create policy audit_logs_admin_read on public.audit_logs
  for select to authenticated using (is_admin());

create policy audit_logs_authenticated_insert on public.audit_logs
  for insert to authenticated
  with check (auth.uid() is not null and actor = auth.uid()::text);

create or replace function public.record_audit_log(
  p_table_name text,
  p_record_id text,
  p_action text,
  p_note text default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null
)
returns public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.audit_logs;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  insert into public.audit_logs (
    table_name, record_id, action, actor, note, old_data, new_data
  ) values (
    p_table_name, p_record_id, p_action, auth.uid()::text, p_note, p_old_data, p_new_data
  )
  returning * into result;
  return result;
end;
$$;

create or replace function public.list_admin_audit_logs()
returns setof public.audit_logs
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;
  return query
    select * from public.audit_logs
    order by created_at desc
    limit 500;
end;
$$;

revoke all on function public.record_audit_log(text, text, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.record_audit_log(text, text, text, text, jsonb, jsonb) to authenticated;
revoke all on function public.list_admin_audit_logs() from public, anon;
grant execute on function public.list_admin_audit_logs() to authenticated;

grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261116000005_operational_match_controls.sql

-- ---------------------------------------------------------------------

-- Operational fields for audited outcomes, decks, and authorized reopening.
alter table public.participants
  add column if not exists deck_combos text[] not null default '{}';

alter table public.matches
  add column if not exists outcome text
    check (outcome is null or outcome in ('normal', 'walkover', 'disqualification', 'abandonment', 'third_place')),
  add column if not exists outcome_note text,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id),
  add column if not exists reopen_reason text;

create or replace function public.reopen_match(
  p_match_id uuid,
  p_expected_version int,
  p_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_actor_role text;
  v_previous jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reopen_reason_required';
  end if;

  select role into v_actor_role
    from public.profiles
   where id = auth.uid();
  if v_actor_role not in ('admin', 'organizer', 'referee') then
    raise exception 'FORBIDDEN';
  end if;

  select *
    into v_match
    from public.matches
   where id = p_match_id
   for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;
  if v_match.status <> 'completed' then
    raise exception 'match_not_completed';
  end if;
  if v_actor_role = 'referee'
     and not exists (
       select 1 from public.matches m
        where m.id = p_match_id and m.referee_id = auth.uid()
     ) then
    raise exception 'FORBIDDEN';
  end if;

  v_previous := to_jsonb(v_match);
  update public.matches
     set winner_id = null,
         is_draw = false,
         score1 = 0,
         score2 = 0,
         sets1 = 0,
         sets2 = 0,
         status = 'pending',
         outcome = null,
         outcome_note = null,
         reopened_at = now(),
         reopened_by = auth.uid(),
         reopen_reason = trim(p_reason),
         finished_at = null,
         version = version + 1
   where id = p_match_id
   returning * into v_match;

  insert into public.audit_log (
    table_name, record_id, action, old_data, new_data, actor
  )
  values (
    'matches', p_match_id, 'reopen', v_previous, to_jsonb(v_match), auth.uid()
  );

  return v_match;
end;
$$;

revoke all on function public.reopen_match(uuid, int, text) from public, anon;
grant execute on function public.reopen_match(uuid, int, text) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261121063011_report_match_sets.sql

-- ---------------------------------------------------------------------

alter table public.matches add column manual_set_scores jsonb;

create schema if not exists apbey_private;
revoke all on schema apbey_private from public, anon;
grant usage on schema apbey_private to authenticated;

-- Scores submitted as a final report belong to that result until an audited
-- reopening. In particular, an older tournament snapshot cannot erase them.
create function apbey_private.guard_manual_set_report()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.manual_set_scores is not null then
    if new.status = 'pending' and new.version > old.version
       and new.reopened_at is distinct from old.reopened_at
       and new.reopened_at is not null then
      new.manual_set_scores := null;
    elsif row(new.status, new.winner_id, new.score1, new.score2, new.sets1, new.sets2,
              new.manual_set_scores, new.participant1_id, new.participant2_id)
      is distinct from
          row(old.status, old.winner_id, old.score1, old.score2, old.sets1, old.sets2,
              old.manual_set_scores, old.participant1_id, old.participant2_id)
      or new.version < old.version then
      raise exception 'version_conflict';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_manual_set_report
before update on public.matches
for each row execute function apbey_private.guard_manual_set_report();

-- Match-scoring RPCs may try to complete the stage after the last currently
-- scheduled matchup. Swiss stages remain open until all configured rounds exist.
create function apbey_private.keep_swiss_stage_open()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type = 'swiss' and new.status = 'completed' and old.status = 'in_progress'
     and (select count(*) from public.rounds where stage_id = new.id and bracket = 'swiss')
       < coalesce(nullif((new.config ->> 'swissRounds')::int, 0), 3) then
    new.status := old.status;
  end if;
  return new;
end;
$$;

create trigger keep_swiss_stage_open
before update of status on public.stages
for each row execute function apbey_private.keep_swiss_stage_open();

create function apbey_private.report_match_sets(
  p_match_id uuid,
  p_expected_version int,
  p_scores jsonb
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  r public.rounds;
  before_report jsonb;
  set_score jsonb;
  v_score1 int;
  v_score2 int;
  target_points int;
  sets_needed int;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner_id uuid;
  v_loser_id uuid;
  next_id uuid;
  advancing_id uuid;
  winner_path boolean;
  preferred_slot int;
  next_round public.rounds;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (public.referees_match(m.id) or public.manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.status = 'completed' and m.version - 1 = p_expected_version and m.manual_set_scores = p_scores then
    return m;
  end if;
  if m.version is distinct from p_expected_version then raise exception 'version_conflict'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.is_bye or m.participant1_id is null or m.participant2_id is null then
    raise exception 'match_not_ready';
  end if;
  if exists (select 1 from public.battles b where b.match_id = m.id and not b.voided)
     or exists (select 1 from public.penalties p where p.match_id = m.id) then
    raise exception 'match_has_live_events';
  end if;

  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  select * into r from public.rounds where id = m.round_id;
  if s.status <> 'in_progress' or t.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;

  if jsonb_typeof(p_scores) is distinct from 'array' then raise exception 'invalid_set_scores'; end if;
  if jsonb_array_length(p_scores) not between 1 and s.best_of then raise exception 'invalid_set_count'; end if;
  sets_needed := s.best_of / 2 + 1;
  target_points := case
    when r.bracket = 'grand_final' or lower(trim(r.name)) = 'gran final' then t.points_to_win_final
    when s.type in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  for set_score in select value from jsonb_array_elements(p_scores) loop
    if v_sets1 = sets_needed or v_sets2 = sets_needed then raise exception 'sets_after_decision'; end if;
    if jsonb_typeof(set_score) <> 'array' then raise exception 'invalid_set_scores'; end if;
    if jsonb_array_length(set_score) <> 2
       or jsonb_typeof(set_score -> 0) is distinct from 'number'
       or jsonb_typeof(set_score -> 1) is distinct from 'number'
       or (set_score ->> 0) !~ '^[0-9]{1,10}$'
       or (set_score ->> 1) !~ '^[0-9]{1,10}$'
       or (set_score ->> 0)::bigint > 2147483647
       or (set_score ->> 1)::bigint > 2147483647 then
      raise exception 'invalid_set_scores';
    end if;
    v_score1 := (set_score ->> 0)::int;
    v_score2 := (set_score ->> 1)::int;
    if (v_score1 >= target_points) = (v_score2 >= target_points) then raise exception 'unfinished_set'; end if;
    if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
  end loop;
  if v_sets1 < sets_needed and v_sets2 < sets_needed then raise exception 'unfinished_match'; end if;

  before_report := to_jsonb(m);
  v_winner_id := case when v_sets1 = sets_needed then m.participant1_id else m.participant2_id end;
  v_loser_id := case when v_sets1 = sets_needed then m.participant2_id else m.participant1_id end;

  update public.matches as match
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         manual_set_scores = p_scores,
         status = 'completed',
         winner_id = v_winner_id,
         is_draw = false,
         outcome = 'normal',
         started_at = coalesce(match.started_at, now()),
         finished_at = now(),
         version = match.version + 1
   where match.id = m.id returning match.* into m;

  -- The existing progression trigger manages grand finals and reset matches.
  for next_id, advancing_id, winner_path in
    select m.next_match_winner_id, v_winner_id, true
    union all select m.next_match_loser_id, v_loser_id, false
  loop
    if next_id is null then continue; end if;
    select round.* into next_round
      from public.matches as next_match
      join public.rounds as round on round.id = next_match.round_id
     where next_match.id = next_id;
    if winner_path and next_round.bracket = 'grand_final' then continue; end if;
    preferred_slot := (m.position - 1) % 2;
    if not winner_path and r.bracket = 'winners' and next_round.bracket = 'losers'
       and not exists (select 1 from public.rounds where stage_id = m.stage_id
                       and bracket = 'losers' and number > next_round.number) then
      preferred_slot := 1;
    end if;

    update public.matches as next_match
       set participant1_id = case when next_match.participant1_id is null
                                    and (preferred_slot = 0 or next_match.participant2_id is not null)
                                  then advancing_id else next_match.participant1_id end,
           participant2_id = case when next_match.participant2_id is null
                                    and (preferred_slot = 1 or next_match.participant1_id is not null)
                                  then advancing_id else next_match.participant2_id end,
           version = next_match.version + 1
     where next_match.id = next_id and next_match.status = 'pending'
       and advancing_id is distinct from next_match.participant1_id
       and advancing_id is distinct from next_match.participant2_id
       and (next_match.participant1_id is null or next_match.participant2_id is null);
  end loop;

  -- Serialize completion checks for simultaneous reports on different matches.
  perform 1 from public.tournaments where id = m.tournament_id for no key update;
  update public.stages set status = 'completed'
   where id = m.stage_id
     and not exists (select 1 from public.matches where stage_id = m.stage_id and status <> 'completed');
  update public.tournaments set status = 'completed'
   where id = m.tournament_id and status = 'in_progress'
     and not exists (select 1 from public.stages where tournament_id = m.tournament_id and status <> 'completed');

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor)
  values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());

  return m;
end;
$$;

create function public.report_match_sets(p_match_id uuid, p_expected_version int, p_scores jsonb)
returns public.matches
language sql
set search_path = ''
as $$
  select * from apbey_private.report_match_sets(p_match_id, p_expected_version, p_scores);
$$;

revoke all on function apbey_private.report_match_sets(uuid, int, jsonb) from public, anon;
revoke all on function public.report_match_sets(uuid, int, jsonb) from public, anon;
grant execute on function apbey_private.report_match_sets(uuid, int, jsonb) to authenticated;
grant execute on function public.report_match_sets(uuid, int, jsonb) to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261121071600_allow_tied_sets.sql

-- ---------------------------------------------------------------------

create or replace function apbey_private.report_match_sets(
  p_match_id uuid,
  p_expected_version int,
  p_scores jsonb
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  r public.rounds;
  before_report jsonb;
  set_score jsonb;
  v_score1 int;
  v_score2 int;
  target_points int;
  sets_needed int;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner_id uuid;
  v_loser_id uuid;
  next_id uuid;
  advancing_id uuid;
  winner_path boolean;
  preferred_slot int;
  next_round public.rounds;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (public.referees_match(m.id) or public.manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.status = 'completed' and m.version - 1 = p_expected_version and m.manual_set_scores = p_scores then
    return m;
  end if;
  if m.version is distinct from p_expected_version then raise exception 'version_conflict'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.is_bye or m.participant1_id is null or m.participant2_id is null then
    raise exception 'match_not_ready';
  end if;
  if exists (select 1 from public.battles b where b.match_id = m.id and not b.voided)
     or exists (select 1 from public.penalties p where p.match_id = m.id) then
    raise exception 'match_has_live_events';
  end if;

  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  select * into r from public.rounds where id = m.round_id;
  if s.status <> 'in_progress' or t.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;

  if jsonb_typeof(p_scores) is distinct from 'array' then raise exception 'invalid_set_scores'; end if;
  if jsonb_array_length(p_scores) = 0 then raise exception 'invalid_set_count'; end if;
  sets_needed := s.best_of / 2 + 1;
  target_points := case
    when r.bracket = 'grand_final' or lower(trim(r.name)) = 'gran final' then t.points_to_win_final
    when s.type in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  for set_score in select value from jsonb_array_elements(p_scores) loop
    if v_sets1 = sets_needed or v_sets2 = sets_needed then raise exception 'sets_after_decision'; end if;
    if jsonb_typeof(set_score) <> 'array' then raise exception 'invalid_set_scores'; end if;
    if jsonb_array_length(set_score) <> 2
       or jsonb_typeof(set_score -> 0) is distinct from 'number'
       or jsonb_typeof(set_score -> 1) is distinct from 'number'
       or (set_score ->> 0) !~ '^[0-9]{1,10}$'
       or (set_score ->> 1) !~ '^[0-9]{1,10}$'
       or (set_score ->> 0)::bigint > 2147483647
       or (set_score ->> 1)::bigint > 2147483647 then
      raise exception 'invalid_set_scores';
    end if;
    v_score1 := (set_score ->> 0)::int;
    v_score2 := (set_score ->> 1)::int;
    if v_score1 = v_score2 then continue; end if;
    if (v_score1 >= target_points) = (v_score2 >= target_points) then raise exception 'unfinished_set'; end if;
    if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
  end loop;
  if v_sets1 < sets_needed and v_sets2 < sets_needed then raise exception 'unfinished_match'; end if;

  before_report := to_jsonb(m);
  v_winner_id := case when v_sets1 = sets_needed then m.participant1_id else m.participant2_id end;
  v_loser_id := case when v_sets1 = sets_needed then m.participant2_id else m.participant1_id end;

  update public.matches as match
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         manual_set_scores = p_scores,
         status = 'completed',
         winner_id = v_winner_id,
         is_draw = false,
         outcome = 'normal',
         started_at = coalesce(match.started_at, now()),
         finished_at = now(),
         version = match.version + 1
   where match.id = m.id returning match.* into m;

  -- The existing progression trigger manages grand finals and reset matches.
  for next_id, advancing_id, winner_path in
    select m.next_match_winner_id, v_winner_id, true
    union all select m.next_match_loser_id, v_loser_id, false
  loop
    if next_id is null then continue; end if;
    select round.* into next_round
      from public.matches as next_match
      join public.rounds as round on round.id = next_match.round_id
     where next_match.id = next_id;
    if winner_path and next_round.bracket = 'grand_final' then continue; end if;
    preferred_slot := (m.position - 1) % 2;
    if not winner_path and r.bracket = 'winners' and next_round.bracket = 'losers'
       and not exists (select 1 from public.rounds where stage_id = m.stage_id
                       and bracket = 'losers' and number > next_round.number) then
      preferred_slot := 1;
    end if;

    update public.matches as next_match
       set participant1_id = case when next_match.participant1_id is null
                                    and (preferred_slot = 0 or next_match.participant2_id is not null)
                                  then advancing_id else next_match.participant1_id end,
           participant2_id = case when next_match.participant2_id is null
                                    and (preferred_slot = 1 or next_match.participant1_id is not null)
                                  then advancing_id else next_match.participant2_id end,
           version = next_match.version + 1
     where next_match.id = next_id and next_match.status = 'pending'
       and advancing_id is distinct from next_match.participant1_id
       and advancing_id is distinct from next_match.participant2_id
       and (next_match.participant1_id is null or next_match.participant2_id is null);
  end loop;

  -- Serialize completion checks for simultaneous reports on different matches.
  perform 1 from public.tournaments where id = m.tournament_id for no key update;
  update public.stages set status = 'completed'
   where id = m.stage_id
     and not exists (select 1 from public.matches where stage_id = m.stage_id and status <> 'completed');
  update public.tournaments set status = 'completed'
   where id = m.tournament_id and status = 'in_progress'
     and not exists (select 1 from public.stages where tournament_id = m.tournament_id and status <> 'completed');

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor)
  values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());

  return m;
end;
$$;




-- ---------------------------------------------------------------------

-- Migration: 20261121100000_live_set_progress.sql

-- ---------------------------------------------------------------------

alter table public.matches add column set_checkpoint jsonb;

create function apbey_private.advance_scored_match(m public.matches, source_bracket text) returns void language plpgsql set search_path = '' as $$
declare
  next_id uuid;
  advancing_id uuid;
  winner_path boolean;
  preferred_slot int;
  next_round public.rounds;
begin
  -- The existing progression trigger manages grand finals and reset matches.
  for next_id, advancing_id, winner_path in
    select m.next_match_winner_id, m.winner_id, true
    union all select m.next_match_loser_id, case when m.winner_id=m.participant1_id then m.participant2_id else m.participant1_id end, false
  loop
    if next_id is null then continue; end if;
    select round.* into next_round
      from public.matches as next_match
      join public.rounds as round on round.id = next_match.round_id
     where next_match.id = next_id;
    if winner_path and next_round.bracket = 'grand_final' then continue; end if;
    preferred_slot := (m.position - 1) % 2;
    if not winner_path and source_bracket = 'winners' and next_round.bracket = 'losers'
       and not exists (select 1 from public.rounds where stage_id = m.stage_id
                       and bracket = 'losers' and number > next_round.number) then
      preferred_slot := 1;
    end if;

    update public.matches as next_match
       set participant1_id = case when next_match.participant1_id is null
                                    and (preferred_slot = 0 or next_match.participant2_id is not null)
                                  then advancing_id else next_match.participant1_id end,
           participant2_id = case when next_match.participant2_id is null
                                    and (preferred_slot = 1 or next_match.participant1_id is not null)
                                  then advancing_id else next_match.participant2_id end,
           version = next_match.version + 1
     where next_match.id = next_id and next_match.status = 'pending'
       and advancing_id is distinct from next_match.participant1_id
       and advancing_id is distinct from next_match.participant2_id
       and (next_match.participant1_id is null or next_match.participant2_id is null);
  end loop;

  -- Serialize completion checks for simultaneous reports on different matches.
  perform 1 from public.tournaments where id = m.tournament_id for no key update;
  update public.stages set status = 'completed'
   where id = m.stage_id
     and not exists (select 1 from public.matches where stage_id = m.stage_id and status <> 'completed');
  update public.tournaments set status = 'completed'
   where id = m.tournament_id and status = 'in_progress'
     and not exists (select 1 from public.stages where tournament_id = m.tournament_id and status <> 'completed');

end;
$$;
revoke all on function apbey_private.advance_scored_match(public.matches,text) from public,anon,authenticated;

create or replace function apbey_private.write_match_sets(
  p_match_id uuid,
  p_expected_version int,
  p_scores jsonb,
  p_partial boolean
)
returns public.matches
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  r public.rounds;
  before_report jsonb;
  set_score jsonb;
  row_number int := 0;
  v_score1 int;
  v_score2 int;
  target_points int;
  sets_needed int;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner_id uuid;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (public.referees_match(m.id) or public.manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if p_partial and m.status = 'in_progress' and m.version - 1 = p_expected_version
     and (m.set_checkpoint->>'version')::int = m.version and m.set_checkpoint->'scores' = p_scores then return m; end if;
  if not p_partial and m.status = 'completed' and m.version - 1 = p_expected_version and m.manual_set_scores = p_scores then
    return m;
  end if;
  if m.version is distinct from p_expected_version then raise exception 'version_conflict'; end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.is_bye or m.participant1_id is null or m.participant2_id is null then
    raise exception 'match_not_ready';
  end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  select * into r from public.rounds where id = m.round_id;
  if s.status <> 'in_progress' or t.status <> 'in_progress' then
    raise exception 'tournament_not_in_progress';
  end if;

  if jsonb_typeof(p_scores) is distinct from 'array' then raise exception 'invalid_set_scores'; end if;
  if jsonb_array_length(p_scores) = 0 then raise exception 'invalid_set_count'; end if;
  sets_needed := s.best_of / 2 + 1;
  target_points := case
    when r.bracket = 'grand_final' or lower(trim(r.name)) = 'gran final' then t.points_to_win_final
    when s.type in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  for set_score in select value from jsonb_array_elements(p_scores) loop
    if v_sets1 = sets_needed or v_sets2 = sets_needed then raise exception 'sets_after_decision'; end if;
    if jsonb_typeof(set_score) <> 'array' then raise exception 'invalid_set_scores'; end if;
    if jsonb_array_length(set_score) <> 2
       or jsonb_typeof(set_score -> 0) is distinct from 'number'
       or jsonb_typeof(set_score -> 1) is distinct from 'number'
       or (set_score ->> 0) !~ '^[0-9]{1,10}$'
       or (set_score ->> 1) !~ '^[0-9]{1,10}$'
       or (set_score ->> 0)::bigint > 2147483647
       or (set_score ->> 1)::bigint > 2147483647 then
      raise exception 'invalid_set_scores';
    end if;
    v_score1 := (set_score ->> 0)::int;
    v_score2 := (set_score ->> 1)::int;
    row_number := row_number + 1;
    if p_partial and row_number = jsonb_array_length(p_scores) then
      if greatest(v_score1, v_score2) >= target_points then raise exception 'unfinished_set'; end if;
      exit;
    end if;
    if v_score1 = v_score2 then continue; end if;
    if (v_score1 >= target_points) = (v_score2 >= target_points) then raise exception 'unfinished_set'; end if;
    if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
  end loop;
  if p_partial then
    before_report := to_jsonb(m);
    update public.matches set score1 = v_score1, score2 = v_score2, sets1 = v_sets1, sets2 = v_sets2,
      set_checkpoint = jsonb_build_object('scores', p_scores, 'version', m.version+1,
        'battleNumber', (select coalesce(max(battle_number),0) from public.battles where match_id = m.id),
        'penaltyIds', (select coalesce(jsonb_agg(id), '[]'::jsonb) from public.penalties where match_id = m.id)),
      status = 'in_progress', started_at = coalesce(started_at, now()), version = version + 1
    where id = m.id returning * into m;
    insert into public.audit_log(table_name,record_id,action,old_data,new_data,actor)
      values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());
    return m;
  end if;
  if v_sets1 < sets_needed and v_sets2 < sets_needed then raise exception 'unfinished_match'; end if;

  before_report := to_jsonb(m);
  v_winner_id := case when v_sets1 = sets_needed then m.participant1_id else m.participant2_id end;

  update public.matches as match
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         manual_set_scores = p_scores,
         status = 'completed',
         winner_id = v_winner_id,
         is_draw = false,
         outcome = 'normal',
         started_at = coalesce(match.started_at, now()),
         finished_at = now(),
         version = match.version + 1
   where match.id = m.id returning match.* into m;

  perform apbey_private.advance_scored_match(m,r.bracket);

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, actor)
  values ('matches', m.id, 'update', before_report, to_jsonb(m), auth.uid());

  return m;
end;
$$;

revoke all on function apbey_private.write_match_sets(uuid,int,jsonb,boolean) from public,anon;
grant execute on function apbey_private.write_match_sets(uuid,int,jsonb,boolean) to authenticated;

create or replace function apbey_private.report_match_sets(p_match_id uuid,p_expected_version int,p_scores jsonb)
returns public.matches language sql set search_path = '' as $$
  select * from apbey_private.write_match_sets(p_match_id,p_expected_version,p_scores,false);
$$;

create function public.save_match_set_progress(p_match_id uuid,p_expected_version int,p_scores jsonb)
returns public.matches language sql set search_path = '' as $$
  select * from apbey_private.write_match_sets(p_match_id,p_expected_version,p_scores,true);
$$;
revoke all on function public.save_match_set_progress(uuid,int,jsonb) from public,anon;
grant execute on function public.save_match_set_progress(uuid,int,jsonb) to authenticated;

create function apbey_private.guard_set_checkpoint() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.set_checkpoint is not null then
    if new.reopened_at is distinct from old.reopened_at and new.status = 'pending' then
      new.set_checkpoint := null;
    elsif new.version < old.version or (new.version = old.version and
      row(new.score1,new.score2,new.sets1,new.sets2,new.status,new.set_checkpoint)
      is distinct from row(old.score1,old.score2,old.sets1,old.sets2,old.status,old.set_checkpoint)) then
      raise exception 'version_conflict';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_set_checkpoint before update on public.matches for each row execute function apbey_private.guard_set_checkpoint();

create function apbey_private.number_live_set() returns trigger language plpgsql set search_path = '' as $$
begin
  select new.set_number + count(*) into new.set_number from public.matches m,
    lateral jsonb_array_elements(m.set_checkpoint->'scores') with ordinality a(score,idx)
    where m.id = new.match_id and idx < jsonb_array_length(m.set_checkpoint->'scores') and score->0 = score->1;
  return new;
end;
$$;
create trigger number_live_set before insert on public.battles for each row execute function apbey_private.number_live_set();
-- Transactional undo for the last non-voided battle of a match.
-- Rebuilds the score from the remaining battle and penalty events so the
-- operation remains correct when the undone battle completed a set or match.

create or replace function public.undo_last_battle(
  p_match_id uuid,
  p_expected_version int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.matches;
  s public.stages;
  t public.tournaments;
  old_winner uuid;
  old_loser uuid;
  sets_needed int;
  target_points int;
  event record;
  v_score1 int := 0;
  v_score2 int := 0;
  v_sets1 int := 0;
  v_sets2 int := 0;
  v_winner uuid := null;
  next_status match_status := 'pending';
begin
  select * into m from public.matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  select * into s from public.stages where id = m.stage_id;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status in ('cancelled', 'completed') then raise exception 'tournament_not_editable'; end if;
  if not exists (
    select 1 from public.battles
     where match_id = p_match_id and battle_number > coalesce((m.set_checkpoint->>'battleNumber')::int,0) and not voided
  ) then
    raise exception 'no_battle_to_undo';
  end if;

  update public.battles
     set voided = true
   where id = (
     select id
       from public.battles
      where match_id = p_match_id and battle_number > coalesce((m.set_checkpoint->>'battleNumber')::int,0) and not voided
      order by created_at desc, battle_number desc
      limit 1
   );

  old_winner := m.winner_id;
  old_loser := case
    when m.winner_id = m.participant1_id then m.participant2_id
    when m.winner_id = m.participant2_id then m.participant1_id
    else null
  end;
  sets_needed := floor(s.best_of / 2) + 1;
  target_points := case
    when exists (
      select 1 from public.rounds r
       where r.id = m.round_id
         and (r.bracket::text = 'grand_final' or lower(coalesce(r.name, '')) = 'gran final')
    ) then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination') then t.points_to_win_playoffs
    when s.type::text = 'group_stage' then t.points_to_win_group
    else s.points_to_win
  end;

  if m.set_checkpoint is not null then
    v_score1 := (m.set_checkpoint->'scores'->-1->>0)::int;
    v_score2 := (m.set_checkpoint->'scores'->-1->>1)::int;
    select count(*) filter(where (score->>0)::int > (score->>1)::int),
           count(*) filter(where (score->>1)::int > (score->>0)::int)
      into v_sets1,v_sets2 from jsonb_array_elements(m.set_checkpoint->'scores') with ordinality a(score,idx)
      where idx < jsonb_array_length(m.set_checkpoint->'scores');
    next_status := 'in_progress';
  end if;
  for event in
    select 'battle' as kind, b.created_at, b.scorer_id as awarded_to, b.points
      from public.battles b
     where b.match_id = p_match_id and b.battle_number > coalesce((m.set_checkpoint->>'battleNumber')::int,0) and not b.voided and b.scorer_id is not null
    union all
    select 'penalty' as kind, p.created_at, p.awarded_to, p.points_awarded
      from public.penalties p
     where p.match_id = p_match_id and not coalesce((m.set_checkpoint->'penaltyIds') ? p.id::text,false) and p.awarded_to is not null and p.points_awarded > 0
    order by created_at
  loop
    if event.awarded_to = m.participant1_id then v_score1 := v_score1 + event.points; end if;
    if event.awarded_to = m.participant2_id then v_score2 := v_score2 + event.points; end if;
    if greatest(v_score1, v_score2) >= target_points then
      if v_score1 > v_score2 then v_sets1 := v_sets1 + 1; else v_sets2 := v_sets2 + 1; end if;
      v_score1 := 0;
      v_score2 := 0;
      if v_sets1 >= sets_needed or v_sets2 >= sets_needed then
        v_winner := case when v_sets1 >= sets_needed then m.participant1_id else m.participant2_id end;
        exit;
      end if;
    end if;
  end loop;

  if v_winner is not null then
    next_status := 'completed';
  elsif v_score1 > 0 or v_score2 > 0 or v_sets1 > 0 or v_sets2 > 0 then
    next_status := 'in_progress';
  end if;

  if old_winner is not null and (v_winner is null or v_winner is distinct from old_winner) then
    perform 1 from public.matches where id in (m.next_match_winner_id, m.next_match_loser_id) for update;
    if exists (select 1 from public.matches where id in (m.next_match_winner_id, m.next_match_loser_id)
      and status <> 'pending' and (participant1_id in (old_winner,old_loser) or participant2_id in (old_winner,old_loser))) then
      raise exception 'downstream_match_started';
    end if;
    update public.matches
       set participant1_id = case when participant1_id in (old_winner, old_loser) then null else participant1_id end,
           participant2_id = case when participant2_id in (old_winner, old_loser) then null else participant2_id end,
           version = version + 1
     where id in (m.next_match_winner_id, m.next_match_loser_id)
       and (participant1_id in (old_winner, old_loser) or participant2_id in (old_winner, old_loser));
  end if;

  update public.matches
     set score1 = v_score1,
         score2 = v_score2,
         sets1 = v_sets1,
         sets2 = v_sets2,
         winner_id = v_winner,
         status = next_status,
         finished_at = case when next_status = 'completed' then finished_at else null end,
         version = version + 1
   where id = p_match_id
   returning * into m;

  if next_status <> 'completed' then
    update public.stages set status = 'in_progress'
     where id = m.stage_id and status = 'completed';
  end if;
  update public.tournaments set status = 'in_progress'
   where id = m.tournament_id and status = 'completed';

  insert into public.audit_log(table_name, record_id, action, old_data, new_data, actor)
  values ('battles', p_match_id, 'undo',
          jsonb_build_object('winner_id', old_winner, 'match_version', p_expected_version),
          jsonb_build_object('winner_id', v_winner, 'match_version', m.version),
          auth.uid());
  return m;
end;
$$;

revoke all on function public.undo_last_battle(uuid, int) from public, anon;
grant execute on function public.undo_last_battle(uuid, int) to authenticated;

create or replace function public.reopen_match(
  p_match_id uuid,
  p_expected_version int,
  p_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_actor_role text;
  v_previous jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reopen_reason_required';
  end if;

  select role into v_actor_role
    from public.profiles
   where id = auth.uid();
  if v_actor_role not in ('admin', 'organizer', 'referee') then
    raise exception 'FORBIDDEN';
  end if;

  select *
    into v_match
    from public.matches
   where id = p_match_id
   for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;
  if v_match.status <> 'completed' then
    raise exception 'match_not_completed';
  end if;
  if not coalesce(public.manages_tournament(v_match.tournament_id) or public.referees_match(v_match.id), false) then
    raise exception 'FORBIDDEN';
  end if;

  v_previous := to_jsonb(v_match);
  update public.matches
     set winner_id = null,
         is_draw = false,
         score1 = 0,
         score2 = 0,
         sets1 = 0,
         sets2 = 0,
         status = 'pending',
         outcome = null,
         outcome_note = null,
         reopened_at = now(),
         reopened_by = auth.uid(),
         reopen_reason = trim(p_reason),
         finished_at = null,
         version = version + 1
   where id = p_match_id
   returning * into v_match;

  insert into public.audit_log (
    table_name, record_id, action, old_data, new_data, actor
  )
  values (
    'matches', p_match_id, 'reopen', v_previous, to_jsonb(v_match), auth.uid()
  );

  return v_match;
end;
$$;

revoke all on function public.reopen_match(uuid, int, text) from public, anon;
grant execute on function public.reopen_match(uuid, int, text) to authenticated;

create or replace function public.record_penalty(
  p_match_id uuid,
  p_offender_id uuid,
  p_card card_type,
  p_is_foul boolean,
  p_points_awarded int,
  p_awarded_to uuid,
  p_reason text,
  p_issued_by uuid,
  p_expected_version int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  m matches;
  t tournaments;
  s stages;
  r rounds;
  rival_id uuid;
  fouls_count int := 0;
  awarded_points int := 0;
  target_points int;
  sets_needed int;
  new_penalty_id uuid;
begin
  if p_issued_by <> auth.uid() then raise exception 'issuer_mismatch'; end if;

  select * into m from matches where id = p_match_id for update;
  if not found then raise exception 'match_not_found'; end if;
  if not (referees_match(p_match_id) or manages_tournament(m.tournament_id)) then
    raise exception 'forbidden';
  end if;
  if m.status = 'completed' then raise exception 'match_closed'; end if;
  if m.version <> p_expected_version then raise exception 'version_conflict'; end if;
  if m.participant1_id is null or m.participant2_id is null then raise exception 'match_not_ready'; end if;
  if p_offender_id not in (m.participant1_id, m.participant2_id) then
    raise exception 'invalid_offender';
  end if;

  rival_id := case when p_offender_id = m.participant1_id
    then m.participant2_id else m.participant1_id end;

  select * into t from tournaments where id = m.tournament_id;
  select * into s from stages where id = m.stage_id;
  select * into r from rounds where id = m.round_id;

  if p_is_foul then
    select count(*) + 1
      into fouls_count
      from penalties
     where match_id = p_match_id
       and participant_id = p_offender_id
       and is_foul;

    if fouls_count % greatest(t.fouls_per_point, 1) = 0 then
      awarded_points := t.foul_points;
    end if;
  end if;

  target_points := case
    when lower(coalesce(r.name, '')) = 'gran final' or r.bracket::text = 'grand_final'
      then t.points_to_win_final
    when s.type::text in ('single_elimination', 'double_elimination')
      then t.points_to_win_playoffs
    when s.type::text = 'group_stage'
      then t.points_to_win_group
    else s.points_to_win
  end;

  insert into penalties (
    match_id, participant_id, card, is_foul, points_awarded, awarded_to, reason, issued_by, created_at
  ) values (
    p_match_id, p_offender_id, p_card, p_is_foul, awarded_points,
    case when awarded_points > 0 then rival_id else null end,
    p_reason, auth.uid(), now()
  ) returning id into new_penalty_id;

  if awarded_points > 0 then
    if rival_id = m.participant1_id then m.score1 := m.score1 + awarded_points;
    else m.score2 := m.score2 + awarded_points;
    end if;

    if greatest(m.score1, m.score2) >= target_points then
      if rival_id = m.participant1_id then m.sets1 := m.sets1 + 1;
      else m.sets2 := m.sets2 + 1;
      end if;
      sets_needed := floor(s.best_of / 2) + 1;
      if m.sets1 >= sets_needed or m.sets2 >= sets_needed then
        m.status := 'completed';
        m.winner_id := case when m.sets1 >= sets_needed
          then m.participant1_id else m.participant2_id end;
        m.finished_at := now();
      else
        m.score1 := 0;
        m.score2 := 0;
      end if;
    end if;
  end if;

  m.status := case when m.status = 'completed' then 'completed' else 'in_progress' end;
  update matches set
    score1 = m.score1,
    score2 = m.score2,
    sets1 = m.sets1,
    sets2 = m.sets2,
    status = m.status,
    winner_id = m.winner_id,
    finished_at = m.finished_at,
    started_at = coalesce(started_at, now()),
    version = version + 1
  where id = p_match_id;

  if m.status = 'completed' then perform apbey_private.advance_scored_match(m,r.bracket); end if;

  return jsonb_build_object(
    'success', true,
    'penalty_id', new_penalty_id,
    'points_awarded', awarded_points,
    'awarded_to', case when awarded_points > 0 then rival_id else null end,
    'new_version', m.version + 1
  );
end;
$$;

revoke all on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.record_penalty(uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer)
  to authenticated;




-- ---------------------------------------------------------------------

-- Migration: 20261123080641_production_security_hardening.sql

-- ---------------------------------------------------------------------

-- Restore the elevated database privileges expected by Supabase secret keys.
-- RLS is intentionally bypassed by service_role, while browser clients remain
-- constrained to anon/authenticated grants and their RLS policies.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant execute on functions to service_role;

-- These tables are private implementation details. Explicit deny policies keep
-- their RLS posture visible to the database linter as well as to reviewers.
drop policy if exists deleted_tournaments_internal_only on public.deleted_tournaments;
create policy deleted_tournaments_internal_only
  on public.deleted_tournaments
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists mutation_idempotency_internal_only on public.mutation_idempotency;
create policy mutation_idempotency_internal_only
  on public.mutation_idempotency
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Evaluate auth.uid() once per statement instead of once per candidate row.
drop policy if exists audit_logs_authenticated_insert on public.audit_logs;
create policy audit_logs_authenticated_insert
  on public.audit_logs
  for insert
  to authenticated
  with check ((select auth.uid()) is not null and actor = (select auth.uid())::text);

-- Cover foreign keys used during profile deletion and match reopen audits.
create index if not exists deleted_tournaments_deleted_by_idx
  on public.deleted_tournaments (deleted_by);
create index if not exists matches_reopened_by_idx
  on public.matches (reopened_by);

-- can_read_tournament is an RLS helper rather than a public RPC. Moving it out
-- of the exposed schema preserves policy dependencies while removing the
-- callable /rest/v1/rpc/can_read_tournament endpoint.
create schema if not exists apbey_private;
revoke all on schema apbey_private from public;
grant usage on schema apbey_private to anon, authenticated, service_role;

do $$
begin
  if to_regprocedure('public.can_read_tournament(uuid)') is not null
    and to_regprocedure('apbey_private.can_read_tournament(uuid)') is null then
    alter function public.can_read_tournament(uuid) set schema apbey_private;
  end if;
end
$$;

revoke all on function apbey_private.can_read_tournament(uuid) from public;
grant execute on function apbey_private.can_read_tournament(uuid)
  to anon, authenticated, service_role;




-- ---------------------------------------------------------------------

-- Migration: 20261123081543_optimize_invitation_policies.sql

-- ---------------------------------------------------------------------

-- Cache identity and role helper calls once per statement instead of once per
-- invitation row. The authorization rules themselves remain unchanged.
drop policy if exists invitations_admin_insert on public.invitations;
create policy invitations_admin_insert
  on public.invitations
  for insert
  with check (
    (select public.is_admin())
    and invited_by = (select auth.uid())::text
  );

drop policy if exists invitations_admin_read on public.invitations;
create policy invitations_admin_read
  on public.invitations
  for select
  using ((select public.is_admin()));

drop policy if exists invitations_update on public.invitations;
create policy invitations_update
  on public.invitations
  for update
  to authenticated
  using (
    (select public.is_admin())
    or (
      (select auth.uid()) is not null
      and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
    )
  )
  with check (
    (select public.is_admin())
    or status = any (array['accepted'::text, 'revoked'::text])
  );




-- ---------------------------------------------------------------------

-- Migration: 20261124034151_protect_operational_transitions.sql

-- ---------------------------------------------------------------------

-- Row updates serialize in PostgreSQL. Compare against the current row after
-- the lock is acquired, including when a snapshot uses INSERT ON CONFLICT.
create function apbey_private.guard_operational_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'matches' then
    if new.version < old.version or
       (new.version = old.version and
        row(new.status, new.winner_id, new.is_draw, new.score1, new.score2, new.sets1, new.sets2)
        is distinct from
        row(old.status, old.winner_id, old.is_draw, old.score1, old.score2, old.sets1, old.sets2)) then
      raise exception 'version_conflict';
    end if;
  elsif new.status::text is distinct from old.status::text then
    if tg_table_name = 'stages' then
      if new.status::text = 'pending' then
        raise exception 'invalid_stage_transition';
      end if;
    elsif old.status::text = 'cancelled' or
      (old.status::text in ('in_progress', 'completed') and new.status::text in ('draft', 'registration')) then
      raise exception 'invalid_tournament_transition';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function apbey_private.guard_operational_transition() from public, anon, authenticated;

create trigger guard_operational_transition
before update on public.matches for each row execute function apbey_private.guard_operational_transition();
create trigger guard_operational_transition
before update of status on public.stages for each row execute function apbey_private.guard_operational_transition();
create trigger guard_operational_transition
before update of status on public.tournaments for each row execute function apbey_private.guard_operational_transition();




-- ---------------------------------------------------------------------

-- Migration: 20261124043609_ranking_signed_points.sql

-- ---------------------------------------------------------------------

-- Ranking totals can be negative after penalties and point differentials.
alter table public.ranking_entries drop constraint if exists ranking_entries_points_check;




-- ---------------------------------------------------------------------

-- Migration: 20261124044040_ranking_safe_delete.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261124053200_ranking_seasons.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261124203500_tournament_ranking_categories.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261124210000_swiss_round_concurrency_and_scoring_access.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261125210000_atomic_officials.sql

-- ---------------------------------------------------------------------

create function public.apply_referee_assignments(p_tournament uuid, p_stages jsonb, p_groups jsonb, p_release uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  if auth.uid() is null or public.manages_tournament(p_tournament) is not true then raise exception 'forbidden'; end if;
  perform 1 from public.tournaments where id=p_tournament for update;
  if p_release is not null then
    update public.matches set referee_id=null, version=version+1
      where tournament_id=p_tournament and referee_id=p_release and status<>'completed';
    update public.groups g set referee_id=null from public.stages s
      where g.stage_id=s.id and s.tournament_id=p_tournament and g.referee_id=p_release;
    update public.stages set config=config-'head_referee_id'
      where tournament_id=p_tournament and config->>'head_referee_id'=p_release::text;
    delete from public.tournament_referees where tournament_id=p_tournament and profile_id=p_release;
  end if;
  for item in select key::uuid as id, value::uuid as official, true as stage from jsonb_each_text(p_stages)
              union all select key::uuid, value::uuid, false from jsonb_each_text(p_groups)
  loop
    if item.official is not null and not exists (
      select 1 from public.profiles where id=item.official and role in ('organizer','referee')
    ) then raise exception 'invalid_official'; end if;
    if item.stage then
      update public.stages set config=case when item.official is null then config-'head_referee_id'
        else jsonb_set(coalesce(config,'{}'),'{head_referee_id}',to_jsonb(item.official)) end
        where id=item.id and tournament_id=p_tournament;
      if not found then raise exception 'invalid_stage'; end if;
      update public.groups set referee_id=item.official where stage_id=item.id;
    else
      update public.groups g set referee_id=item.official from public.stages s
        where g.id=item.id and s.id=g.stage_id and s.tournament_id=p_tournament;
      if not found then raise exception 'invalid_group'; end if;
    end if;
    update public.matches set referee_id=item.official,version=version+1
      where tournament_id=p_tournament and status<>'completed'
        and ((item.stage and stage_id=item.id) or (not item.stage and group_id=item.id));
    if item.official is not null then
      insert into public.tournament_referees(tournament_id,profile_id)
        values(p_tournament,item.official) on conflict do nothing;
    end if;
  end loop;
  insert into public.audit_log(table_name,record_id,action,actor)
    values ('tournament_referees',p_tournament,'update',auth.uid());
end $$;
revoke all on function public.apply_referee_assignments(uuid,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.apply_referee_assignments(uuid,jsonb,jsonb,uuid) to authenticated;

create function public.list_eligible_officials()
returns table(id uuid,display_name text,role public.user_role)
language sql stable security definer set search_path='' as $$
  select p.id,p.display_name,p.role from public.profiles p
  where (public.is_admin() or public.is_organizer()) and p.role in ('organizer','referee')
  order by p.display_name,p.id
$$;
revoke all on function public.list_eligible_officials() from public,anon;
grant execute on function public.list_eligible_officials() to authenticated;

do $$
declare relation text;
begin
  foreach relation in array array['group_participants','tournament_referees','tournament_finish_points'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename=relation) then
      execute format('alter publication supabase_realtime add table public.%I',relation);
    end if;
  end loop;
end $$;




-- ---------------------------------------------------------------------

-- Migration: 20261125210100_guard_tournament_snapshots.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261126000000_lock_started_stage_tiebreakers.sql

-- ---------------------------------------------------------------------

-- Competitive tie-break settings must not change after a stage starts.
create or replace function public.prevent_started_stage_tiebreaker_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.status <> 'pending' or new.status <> 'pending')
     and new.config -> 'tiebreakers' is distinct from old.config -> 'tiebreakers' then
    raise exception using
      errcode = '55000',
      message = 'stage_tiebreakers_locked';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_started_stage_tiebreaker_changes on public.stages;
create trigger prevent_started_stage_tiebreaker_changes
before update of status, config on public.stages
for each row execute function public.prevent_started_stage_tiebreaker_changes();




-- ---------------------------------------------------------------------

-- Migration: 20261126000100_avoid_snapshot_pool_contention.sql

-- ---------------------------------------------------------------------

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




-- ---------------------------------------------------------------------

-- Migration: 20261126000200_drop_unused_indexes.sql

-- ---------------------------------------------------------------------

-- Optimization: drop unused indexes to reduce write overhead on tournament tables.
-- All 13 indexes had idx_scan = 0 as of 2026-11-25.
-- FK-based indexes for joins (group_id, stage_id) are retained via existing PKs.

DROP INDEX IF EXISTS public.idx_matches_referee_active;
DROP INDEX IF EXISTS public.invitations_email_status_idx;
DROP INDEX IF EXISTS public.invitations_code_idx;
DROP INDEX IF EXISTS public.mutation_idempotency_created_at_idx;
DROP INDEX IF EXISTS public.battles_recorded_by_idx;
DROP INDEX IF EXISTS public.group_participants_participant_id_idx;
DROP INDEX IF EXISTS public.groups_referee_id_idx;
DROP INDEX IF EXISTS public.participants_profile_id_idx;
DROP INDEX IF EXISTS public.penalties_issued_by_idx;
DROP INDEX IF EXISTS public.rounds_group_id_idx;
DROP INDEX IF EXISTS public.tournament_referees_profile_id_idx;
DROP INDEX IF EXISTS public.deleted_tournaments_deleted_by_idx;
DROP INDEX IF EXISTS public.matches_reopened_by_idx;




-- ---------------------------------------------------------------------

-- Migration: 20261126000300_connection_pool_protection.sql

-- ---------------------------------------------------------------------

-- Prevent zombie connections from blocking the PostgREST connection pool.
-- idle_in_transaction_session_timeout: auto-cancels stuck transactions after 30s
-- statement_timeout on publish_tournament_snapshot: breaks loops that hammer the RPC

ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '30s';

ALTER FUNCTION public.publish_tournament_snapshot(
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
) SET statement_timeout = '10s';


