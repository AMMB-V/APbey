-- Rollback-only authorization and idempotency coverage for referee mutations.
begin;

select plan(5);

create temporary table mutation_results (
  test_name text primary key,
  passed boolean not null,
  details text
) on commit drop;

create temporary table mutation_fixture (
  organizer_id uuid not null,
  referee_id uuid not null,
  unrelated_id uuid not null,
  tournament_id uuid not null,
  match_id uuid not null
) on commit drop;

do $$
declare
  organizer_id uuid := gen_random_uuid();
  referee_id uuid := gen_random_uuid();
  unrelated_id uuid := gen_random_uuid();
  tournament_id uuid;
  stage_id uuid := gen_random_uuid();
  round_id uuid := gen_random_uuid();
  participant_one_id uuid := gen_random_uuid();
  participant_two_id uuid := gen_random_uuid();
  match_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous
  )
  values
    (organizer_id, 'authenticated', 'authenticated', 'mutation-organizer@apbey.test', now(), '{}', '{}', now(), now(), false, false),
    (referee_id, 'authenticated', 'authenticated', 'mutation-referee@apbey.test', now(), '{}', '{}', now(), now(), false, false),
    (unrelated_id, 'authenticated', 'authenticated', 'mutation-unrelated@apbey.test', now(), '{}', '{}', now(), now(), false, false);

  insert into public.profiles (id, display_name, role)
  values
    (organizer_id, 'Mutation Organizer', 'organizer'),
    (referee_id, 'Mutation Referee', 'referee'),
    (unrelated_id, 'Mutation Unrelated', 'blader');

  insert into public.tournaments (
    slug, name, organizer_id, status, is_public
  )
  values (
    'mutation-' || substr(gen_random_uuid()::text, 1, 8),
    'Mutation authorization tournament',
    organizer_id,
    'in_progress',
    false
  )
  returning id into tournament_id;

  insert into public.tournament_referees (tournament_id, profile_id)
  values (tournament_id, referee_id);

  insert into public.stages (
    id, tournament_id, position, name, type, status, match_type, points_to_win, best_of
  )
  values (
    stage_id, tournament_id, 1, 'Mutation stage', 'single_elimination',
    'in_progress', '1on1', 4, 1
  );

  insert into public.rounds (id, stage_id, number, bracket, name)
  values (round_id, stage_id, 1, 'winners', 'Ronda 1');

  insert into public.participants (id, tournament_id, display_name, seed, status)
  values
    (participant_one_id, tournament_id, 'Mutation One', 1, 'active'),
    (participant_two_id, tournament_id, 'Mutation Two', 2, 'active');

  insert into public.matches (
    id, tournament_id, stage_id, round_id, position,
    participant1_id, participant2_id, referee_id, status, version
  )
  values (
    match_id, tournament_id, stage_id, round_id, 1,
    participant_one_id, participant_two_id, referee_id, 'pending', 1
  );

  insert into mutation_fixture
  values (organizer_id, referee_id, unrelated_id, tournament_id, match_id);
end
$$;

grant select on mutation_fixture to authenticated;
grant select, insert on mutation_results to authenticated;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select referee_id from mutation_fixture),
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  fixture mutation_fixture;
  first_result public.matches;
begin
  select * into fixture from mutation_fixture;
  first_result := public.record_battle_idempotent(
    fixture.match_id,
    (select participant1_id from public.matches where id = fixture.match_id),
    'spin',
    1,
    'record-battle:mutation-test',
    gen_random_uuid()
  );
  insert into mutation_results
  values ('assigned_referee_can_record_battle', first_result.version = 2, 'First mutation accepted');
exception when others then
  insert into mutation_results
  values ('assigned_referee_can_record_battle', false, sqlerrm);
end
$$;

do $$
declare
  fixture mutation_fixture;
  replay_result public.matches;
begin
  select * into fixture from mutation_fixture;
  replay_result := public.record_battle_idempotent(
    fixture.match_id,
    (select participant1_id from public.matches where id = fixture.match_id),
    'spin',
    1,
    'record-battle:mutation-test',
    gen_random_uuid()
  );
  insert into mutation_results
  values (
    'battle_retry_is_idempotent',
    replay_result.version = 2
      and (select count(*) from public.battles where match_id = fixture.match_id) = 1,
    'Retry returned the original result without duplicating the battle'
  );
exception when others then
  insert into mutation_results
  values ('battle_retry_is_idempotent', false, sqlerrm);
end
$$;

do $$
declare
  fixture mutation_fixture;
  undo_result public.matches;
begin
  select * into fixture from mutation_fixture;
  undo_result := public.undo_last_battle_idempotent(
    fixture.match_id,
    2,
    'undo-battle:mutation-test',
    gen_random_uuid()
  );
  insert into mutation_results
  values (
    'assigned_referee_can_undo',
    undo_result.version = 3
      and exists (
        select 1
        from public.battles
        where match_id = fixture.match_id and voided
      ),
    'Undo is authorized and transactional'
  );
exception when others then
  insert into mutation_results
  values ('assigned_referee_can_undo', false, sqlerrm);
end
$$;

do $$
declare
  fixture mutation_fixture;
  replay_result public.matches;
begin
  select * into fixture from mutation_fixture;
  replay_result := public.undo_last_battle_idempotent(
    fixture.match_id,
    2,
    'undo-battle:mutation-test',
    gen_random_uuid()
  );
  insert into mutation_results
  values (
    'undo_retry_is_idempotent',
    replay_result.version = 3
      and (select count(*) from public.battles where match_id = fixture.match_id and voided) = 1,
    'Undo retry returned the original result'
  );
exception when others then
  insert into mutation_results
  values ('undo_retry_is_idempotent', false, sqlerrm);
end
$$;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select unrelated_id from mutation_fixture),
    'role', 'authenticated'
  )::text,
  true
);

do $$
declare
  fixture mutation_fixture;
begin
  select * into fixture from mutation_fixture;
  begin
    perform public.record_battle_idempotent(
      fixture.match_id,
      (select participant1_id from public.matches where id = fixture.match_id),
      'spin',
      3,
      'record-battle:unrelated-test',
      gen_random_uuid()
    );
    insert into mutation_results
    values ('unrelated_user_is_denied', false, 'Mutation unexpectedly succeeded');
  exception when others then
    insert into mutation_results
    values ('unrelated_user_is_denied', sqlerrm = 'forbidden', sqlerrm);
  end;
end
$$;

select ok(passed, test_name)
from mutation_results
order by test_name;

select * from finish();
rollback;
