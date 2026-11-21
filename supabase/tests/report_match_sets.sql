begin;
select plan(13);

create temp table set_report_fixture as
select gen_random_uuid() as organizer, gen_random_uuid() as referee, gen_random_uuid() as other_user,
       gen_random_uuid() as tournament, gen_random_uuid() as stage, gen_random_uuid() as round,
       gen_random_uuid() as p1, gen_random_uuid() as p2, gen_random_uuid() as match,
       gen_random_uuid() as next_match, gen_random_uuid() as next_round;
grant select on set_report_fixture to authenticated;

insert into auth.users (id, email)
select organizer, 'set-report-organizer@apbey.test' from set_report_fixture
union all select referee, 'set-report-referee@apbey.test' from set_report_fixture
union all select other_user, 'set-report-other@apbey.test' from set_report_fixture;

insert into public.profiles (id, display_name, role)
select organizer, 'Organizer', 'organizer'::public.user_role from set_report_fixture
union all select referee, 'Referee', 'referee'::public.user_role from set_report_fixture
union all select other_user, 'Other', 'organizer'::public.user_role from set_report_fixture;

insert into public.tournaments (id, slug, name, organizer_id, status)
select tournament, 'report-sets-test', 'Report sets test', organizer, 'in_progress'
from set_report_fixture;

insert into public.tournament_referees (tournament_id, profile_id)
select tournament, referee from set_report_fixture;

insert into public.stages (id, tournament_id, position, name, type, status, best_of)
select stage, tournament, 1, 'Report stage', 'single_elimination', 'in_progress', 3
from set_report_fixture;

insert into public.rounds (id, stage_id, number, bracket)
select round, stage, 1, 'winners'::text from set_report_fixture
union all select next_round, stage, 2, 'winners'::text from set_report_fixture;

insert into public.participants (id, tournament_id, display_name, seed)
select p1, tournament, 'Blu', 1 from set_report_fixture
union all select p2, tournament, 'Orange', 2 from set_report_fixture;

insert into public.matches (id, tournament_id, stage_id, round_id, position, version)
select next_match, tournament, stage, next_round, 1, 1 from set_report_fixture;
insert into public.matches (
  id, tournament_id, stage_id, round_id, position, participant1_id, participant2_id, referee_id, next_match_winner_id, version
)
select match, tournament, stage, round, 2, p1, p2, referee, next_match, 1 from set_report_fixture;

select ok(not has_function_privilege('anon', 'public.report_match_sets(uuid,integer,jsonb)', 'EXECUTE'),
          'Anonymous requests cannot call the reporting RPC');
set local role authenticated;
select set_config('request.jwt.claim.sub', other_user::text, true) from set_report_fixture;
select throws_ok(
  format('select public.report_match_sets(%L, 1, %L)', match, '[[5,0],[5,0]]'),
  'P0001', 'forbidden', 'An organizer of a different tournament cannot submit'
) from set_report_fixture;

select set_config('request.jwt.claim.sub', referee::text, true) from set_report_fixture;
select throws_ok(
  format('select public.report_match_sets(%L, 1, %L)', match, '[[5,0]]'),
  'P0001', 'unfinished_match', 'One set does not close a best-of-three'
) from set_report_fixture;
select throws_ok(
  format('select public.report_match_sets(%L, 1, %L)', match, '[[5,0],[5,0],[0,5]]'),
  'P0001', 'sets_after_decision', 'Sets after the winning set are rejected atomically'
) from set_report_fixture;
select is((select version from public.matches where id = fixture.match), 1, 'Invalid reports preserve match version')
from set_report_fixture fixture;

select is((public.report_match_sets(match, 1, '[[5,0],[6,3]]')).version, 2, 'The assigned referee confirms a sweep')
from set_report_fixture;
select is((public.report_match_sets(match, 1, '[[5,0],[6,3]]')).version, 2, 'Retry returns the result without mutating again')
from set_report_fixture;
select throws_ok(
  format('select public.report_match_sets(%L, 1, %L)', match, '[[0,5],[0,5]]'),
  'P0001', 'version_conflict', 'A competing result cannot overwrite the confirmed report'
) from set_report_fixture;
reset role;

select is((select manual_set_scores from public.matches where id = fixture.match),
          '[[5,0],[6,3]]'::jsonb, 'Both players’ scores are retained for each set')
from set_report_fixture fixture;
select is((select participant2_id from public.matches where id = fixture.next_match), fixture.p1,
          'The confirmed winner advances to the correct slot')
from set_report_fixture fixture;
select is((select count(*) from public.audit_log where record_id = fixture.match::text), 1::bigint, 'The report is audited once')
from set_report_fixture fixture;

update public.stages set type = 'swiss', best_of = 1, config = '{"swissRounds":3}'
where id = (select stage from set_report_fixture);
update public.rounds set bracket = 'swiss' where stage_id = (select stage from set_report_fixture);
update public.matches set participant1_id = (select p2 from set_report_fixture)
where id = (select next_match from set_report_fixture);

set local role authenticated;
select set_config('request.jwt.claim.sub', organizer::text, true) from set_report_fixture;
select is((public.report_match_sets(next_match, 2, '[[4,0]]')).status::text, 'completed',
          'The report completes the last available Swiss match')
from set_report_fixture;
reset role;
select is((select status::text from public.stages where id = fixture.stage), 'in_progress',
          'Swiss remains open while a configured round is missing')
from set_report_fixture fixture;

select * from finish();
rollback;
