-- Rollback-only RLS matrix for a staging Supabase project.
-- This creates temporary Auth users/profiles inside the transaction and
-- rolls everything back. It does not create persistent accounts or data.

begin;

create temporary table rls_role_results (
  test_name text not null,
  passed boolean not null,
  details text
) on commit drop;

create temporary table rls_fixture (
  admin_id uuid not null,
  organizer_id uuid not null,
  referee_id uuid not null,
  blader_id uuid not null,
  unrelated_id uuid not null,
  tournament_id uuid not null
) on commit drop;

do $$
declare
  admin_id uuid;
  organizer_id uuid := gen_random_uuid();
  referee_id uuid := gen_random_uuid();
  blader_id uuid := gen_random_uuid();
  unrelated_id uuid := gen_random_uuid();
  tournament_id uuid;
begin
  select id
    into admin_id
    from public.profiles
   where role = 'admin'
   order by created_at
   limit 1;

  if admin_id is null then
    raise exception 'An admin profile is required for this rollback-only test';
  end if;

  insert into auth.users (
    id,
    aud,
    role,
    email,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  )
  values
    (organizer_id, 'authenticated', 'authenticated', 'rls-organizer@apbet.vercel.app', now(), '{}'::jsonb, '{"display_name":"RLS Organizer"}'::jsonb, now(), now(), false, false),
    (referee_id, 'authenticated', 'authenticated', 'rls-referee@apbet.vercel.app', now(), '{}'::jsonb, '{"display_name":"RLS Referee"}'::jsonb, now(), now(), false, false),
    (blader_id, 'authenticated', 'authenticated', 'rls-blader@apbet.vercel.app', now(), '{}'::jsonb, '{"display_name":"RLS Blader"}'::jsonb, now(), now(), false, false),
    (unrelated_id, 'authenticated', 'authenticated', 'rls-unrelated@apbet.vercel.app', now(), '{}'::jsonb, '{"display_name":"RLS Unrelated"}'::jsonb, now(), now(), false, false);

  insert into public.profiles (id, display_name, role)
  values
    (organizer_id, 'RLS Organizer', 'organizer'),
    (referee_id, 'RLS Referee', 'referee'),
    (blader_id, 'RLS Blader', 'blader'),
    (unrelated_id, 'RLS Unrelated', 'blader');

  insert into public.tournaments (slug, name, organizer_id, is_public, status)
  values (
    'rls-role-' || substr(gen_random_uuid()::text, 1, 8),
    'RLS role matrix tournament',
    organizer_id,
    false,
    'draft'
  )
  returning id into tournament_id;

  insert into public.tournament_referees (tournament_id, profile_id)
  values (tournament_id, referee_id);

  insert into rls_fixture
  values (admin_id, organizer_id, referee_id, blader_id, unrelated_id, tournament_id);
end
$$;

grant select, insert, update on rls_role_results to authenticated;
grant select on rls_fixture to authenticated;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', organizer_id, 'role', 'authenticated')::text,
  true
)
from rls_fixture;

insert into rls_role_results
select
  'organizer_can_read_own_tournament',
  exists (
    select 1
    from public.tournaments t
    join rls_fixture f on f.tournament_id = t.id
  ),
  'Organizer reads own private tournament';

with updated as (
  update public.tournaments
     set name = 'RLS organizer update'
   where id = (select tournament_id from rls_fixture)
  returning id
)
insert into rls_role_results
select
  'organizer_can_update_own_tournament',
  exists (select 1 from updated),
  'Organizer updates own tournament';

select set_config(
  'request.jwt.claims',
  json_build_object('sub', referee_id, 'role', 'authenticated')::text,
  true
)
from rls_fixture;

insert into rls_role_results
select
  'referee_can_read_assigned_tournament',
  exists (
    select 1
    from public.tournaments t
    join rls_fixture f on f.tournament_id = t.id
  ),
  'Assigned referee reads private tournament';

with updated as (
  update public.tournaments
     set name = 'RLS referee update denied'
   where id = (select tournament_id from rls_fixture)
  returning id
)
insert into rls_role_results
select
  'referee_cannot_update_tournament',
  not exists (select 1 from updated),
  'Assigned referee cannot manage tournament';

select set_config(
  'request.jwt.claims',
  json_build_object('sub', blader_id, 'role', 'authenticated')::text,
  true
)
from rls_fixture;

insert into rls_role_results
select
  'blader_cannot_read_private_tournament_without_participation',
  not exists (
    select 1
    from public.tournaments t
    join rls_fixture f on f.tournament_id = t.id
  ),
  'Unrelated blader cannot read private tournament';

with updated as (
  update public.tournaments
     set name = 'RLS blader update denied'
   where id = (select tournament_id from rls_fixture)
  returning id
)
insert into rls_role_results
select
  'blader_cannot_update_tournament',
  not exists (select 1 from updated),
  'Blader cannot manage tournament';

select set_config(
  'request.jwt.claims',
  json_build_object('sub', unrelated_id, 'role', 'authenticated')::text,
  true
)
from rls_fixture;

insert into rls_role_results
select
  'unrelated_user_cannot_read_private_tournament',
  not exists (
    select 1
    from public.tournaments t
    join rls_fixture f on f.tournament_id = t.id
  ),
  'Unrelated user cannot read private tournament';

with updated as (
  update public.tournaments
     set name = 'RLS unrelated update denied'
   where id = (select tournament_id from rls_fixture)
  returning id
)
insert into rls_role_results
select
  'unrelated_user_cannot_update_tournament',
  not exists (select 1 from updated),
  'Unrelated user cannot manage tournament';

select set_config(
  'request.jwt.claims',
  json_build_object('sub', admin_id, 'role', 'authenticated')::text,
  true
)
from rls_fixture;

select public.publish_rankings(
  '[{"id":"rls-ranking","name":"RLS Test","points":10,"elo":100,"wins":1,"losses":0,"tournaments_won":1,"favorite_combo":"Test"}]'::jsonb,
  '[{"id":"rls-hof","tournament_title":"RLS Test","champion":"RLS Test","runner_up":null,"date":"2026-10-29","winning_combo":"Test","participants_count":1}]'::jsonb
);

insert into rls_role_results
select
  'admin_can_publish_rankings_transactionally',
  exists (select 1 from public.ranking_entries where id = 'rls-ranking')
    and exists (select 1 from public.hall_of_fame_entries where id = 'rls-hof'),
  'publish_rankings completed inside rollback-only transaction';

select
  json_agg(
    json_build_object(
      'test', test_name,
      'passed', passed,
      'details', details
    )
    order by test_name
  ) as results,
  count(*) filter (where not passed) as failures
from rls_role_results;

rollback;
