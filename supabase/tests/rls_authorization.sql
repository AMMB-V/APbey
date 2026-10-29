-- Reproducible, rollback-only smoke test for tournament-scoped RLS.
-- Run against a staging project with the SQL editor or Supabase CLI.

begin;

create temporary table rls_test_ids (tournament_id uuid) on commit drop;
create temporary table rls_test_users (admin_id uuid) on commit drop;
create temporary table rls_test_results (
  test_name text not null,
  passed boolean not null,
  details text
) on commit drop;

do $$
declare
  admin_id uuid;
  test_id uuid;
begin
  select id into admin_id
    from public.profiles
   where role = 'admin'
   order by created_at
   limit 1;

  if admin_id is null then
    raise exception 'An admin profile is required for this rollback-only test';
  end if;

  insert into public.tournaments (slug, name, organizer_id, is_public, status)
  values (
    'rls-test-' || substr(gen_random_uuid()::text, 1, 8),
    'RLS test tournament',
    admin_id,
    false,
    'draft'
  )
  returning id into test_id;

  insert into rls_test_users values (admin_id);
  insert into rls_test_ids values (test_id);
end
$$;

grant select, insert on rls_test_ids, rls_test_users, rls_test_results to authenticated;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select admin_id from rls_test_users),
    'role', 'authenticated'
  )::text,
  true
);

insert into rls_test_results
select
  'organizer_can_read_owned_private_tournament',
  exists (
    select 1
    from public.tournaments t
    join rls_test_ids x on x.tournament_id = t.id
  ),
  'The organizer can read its own private tournament';

insert into rls_test_results
select
  'organizer_can_manage_owned_private_tournament',
  exists (
    select 1
    from rls_test_ids
    where public.manages_tournament(tournament_id)
  ),
  'The organizer is recognized by the tournament-scoped helper';

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '00000000-0000-0000-0000-000000000001',
    'role', 'authenticated'
  )::text,
  true
);

insert into rls_test_results
select
  'unrelated_user_cannot_read_private_tournament',
  not exists (
    select 1
    from public.tournaments t
    join rls_test_ids x on x.tournament_id = t.id
  ),
  'An unrelated authenticated user cannot read another organizer private tournament';

do $$
declare
  affected integer;
begin
  update public.tournaments
     set name = 'should-not-update'
   where id in (select tournament_id from rls_test_ids);

  get diagnostics affected = row_count;
  insert into rls_test_results
  values (
    'unrelated_user_cannot_update_private_tournament',
    affected = 0,
    format('Rows updated: %s', affected)
  );
end
$$;

select json_agg(
  json_build_object(
    'test', test_name,
    'passed', passed,
    'details', details
  )
  order by test_name
) as results
from rls_test_results;

rollback;
