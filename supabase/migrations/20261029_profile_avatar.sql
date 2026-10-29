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
    and owner_id = (select auth.uid())
  )
  with check (
    bucket_id = 'avatars'
    and owner_id = (select auth.uid())
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
