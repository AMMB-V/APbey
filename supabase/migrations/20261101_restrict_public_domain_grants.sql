-- Keep public reads available while preventing direct anonymous writes.
-- RLS remains the authorization boundary for authenticated mutations.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'tournaments',
    'tournament_finish_points',
    'tournament_referees',
    'participants',
    'stages',
    'groups',
    'group_participants',
    'rounds',
    'matches',
    'battles',
    'penalties'
  ] loop
    execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', table_name);
    execute format('grant select on public.%I to anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end
$$;
