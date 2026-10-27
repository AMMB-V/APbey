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
