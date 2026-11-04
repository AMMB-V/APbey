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
