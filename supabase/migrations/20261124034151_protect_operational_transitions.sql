-- Row updates serialize in PostgreSQL. Compare against the current row after
-- the lock is acquired, including when a snapshot uses INSERT ON CONFLICT.
create function apbey_private.guard_operational_transition()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'matches' then
    if new.version < old.version or
       (new.version = old.version and
        row(new.status, new.winner_id, new.is_draw, new.score1, new.score2, new.sets1, new.sets2)
        is distinct from
        row(old.status, old.winner_id, old.is_draw, old.score1, old.score2, old.sets1, old.sets2)) then
      raise exception 'version_conflict';
    end if;
  elsif new.status::text is distinct from old.status::text then
    if tg_table_name = 'stages' then
      if new.status::text = 'pending' then
        raise exception 'invalid_stage_transition';
      end if;
    elsif old.status::text = 'cancelled' or
      (old.status::text in ('in_progress', 'completed') and new.status::text in ('draft', 'registration')) then
      raise exception 'invalid_tournament_transition';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function apbey_private.guard_operational_transition() from public, anon, authenticated;

create trigger guard_operational_transition
before update on public.matches for each row execute function apbey_private.guard_operational_transition();
create trigger guard_operational_transition
before update of status on public.stages for each row execute function apbey_private.guard_operational_transition();
create trigger guard_operational_transition
before update of status on public.tournaments for each row execute function apbey_private.guard_operational_transition();
