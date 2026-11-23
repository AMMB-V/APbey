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
