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
