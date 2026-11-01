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
