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
