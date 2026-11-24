begin;
select plan(4);

create temp table transition_fixture as
select gen_random_uuid() as owner_id, gen_random_uuid() as blader_id, gen_random_uuid() as tournament_id,
  gen_random_uuid() as stage_id, gen_random_uuid() as participant_id;
grant select on transition_fixture to authenticated;
insert into auth.users(id,email) select owner_id, owner_id || '@apbey.test' from transition_fixture;
insert into auth.users(id,email) select blader_id, blader_id || '@apbey.test' from transition_fixture;
insert into public.profiles(id,display_name,role) select owner_id,'Fixture','organizer' from transition_fixture;
insert into public.profiles(id,display_name,role) select blader_id,'Blader','blader' from transition_fixture;
insert into public.tournaments(id,slug,name,organizer_id,status)
select tournament_id, tournament_id::text,'Fixture',owner_id,'in_progress' from transition_fixture;
insert into public.stages(id,tournament_id,position,name,type,status)
select stage_id,tournament_id,2,'Suizo final','swiss','pending' from transition_fixture;

set local role authenticated;
select set_config('request.jwt.claim.sub',owner_id::text,true) from transition_fixture;
select is((public.publish_tournament_snapshot(to_jsonb(t) || '{"category":"grand"}'::jsonb,'[]','[]',
  jsonb_build_array(jsonb_build_object('id',f.participant_id,'tournament_id',f.tournament_id,
    'profile_id',f.blader_id,'display_name','Blader','seed',1,'checked_in',true,'inspected',false,
    'deck_combos','[]'::jsonb,'status','active')),
  jsonb_build_array(to_jsonb(s) || '{"status":"in_progress","config":{"pointsPerBye":1,"pointsPerMatchWin":1}}'::jsonb),
  '[]','[]','[]','[]','[]','[]')).id,t.id,'Publishing returns the tournament record')
from transition_fixture f join public.tournaments t on t.id=f.tournament_id join public.stages s on s.id=f.stage_id;
select is((select count(*) from public.stages s join transition_fixture f on s.tournament_id=f.tournament_id
  where s.id=f.stage_id and s.type='swiss' and s.status='in_progress' and s.config->>'pointsPerBye'='1'),
  1::bigint,'The configured Swiss stage retains its identity and rules');
select is((select category from public.tournaments t join transition_fixture f on t.id=f.tournament_id),
  'grand','The ranking category is persisted atomically');
select is((select profile_id from public.participants p join transition_fixture f on p.id=f.participant_id),
  (select blader_id from transition_fixture),'The participant keeps the linked ranking profile');
select * from finish();
rollback;
