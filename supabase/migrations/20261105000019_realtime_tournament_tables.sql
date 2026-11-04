-- Publish every tournament-domain table needed by live multi-user views.
-- The catalog check keeps this migration safe when a table is already enabled.

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
    if not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = table_name
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        table_name
      );
    end if;
  end loop;
end;
$$;
