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
