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
