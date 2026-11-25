-- Competitive tie-break settings must not change after a stage starts.
create or replace function public.prevent_started_stage_tiebreaker_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.status <> 'pending' or new.status <> 'pending')
     and new.config -> 'tiebreakers' is distinct from old.config -> 'tiebreakers' then
    raise exception using
      errcode = '55000',
      message = 'stage_tiebreakers_locked';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_started_stage_tiebreaker_changes on public.stages;
create trigger prevent_started_stage_tiebreaker_changes
before update of status, config on public.stages
for each row execute function public.prevent_started_stage_tiebreaker_changes();
