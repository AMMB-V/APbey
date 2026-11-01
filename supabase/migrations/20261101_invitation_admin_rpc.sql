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
