-- Route double-elimination finalists deterministically and manage the
-- optional grand-final reset match without trusting client-side ordering.
create or replace function public.route_double_elimination_progression()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  source_bracket text;
  target_bracket text;
  reset_match public.matches;
begin
  if new.status = 'completed' and new.winner_id is not null
     and new.next_match_winner_id is not null then
    select r.bracket::text
      into source_bracket
      from public.rounds r
     where r.id = new.round_id;

    select r.bracket::text
      into target_bracket
      from public.matches m
      join public.rounds r on r.id = m.round_id
     where m.id = new.next_match_winner_id
     for update;

    if target_bracket = 'grand_final' then
      if source_bracket = 'winners' then
        update public.matches
           set participant1_id = new.winner_id,
               participant2_id = case
                 when participant1_id = new.winner_id then participant2_id
                 else participant1_id
               end,
               version = version + 1
         where id = new.next_match_winner_id;
      elsif source_bracket = 'losers' then
        update public.matches
           set participant1_id = case
                 when participant1_id = new.winner_id then null
                 else participant1_id
               end,
               participant2_id = new.winner_id,
               version = version + 1
         where id = new.next_match_winner_id;
      end if;
    end if;
  end if;

  if new.status = 'completed' and new.winner_id is not null then
    if exists (
      select 1
        from public.rounds r
       where r.id = new.round_id
         and r.bracket = 'grand_final'
    ) and new.position = 1 then
      select *
        into reset_match
        from public.matches
       where round_id = new.round_id
         and position = 2
       for update;

      if found and reset_match.status <> 'completed' then
        if new.winner_id = new.participant1_id then
          update public.matches
             set participant1_id = new.participant1_id,
                 participant2_id = new.participant2_id,
                 winner_id = new.winner_id,
                 is_bye = true,
                 status = 'completed',
                 finished_at = coalesce(new.finished_at, now()),
                 version = version + 1
           where id = reset_match.id;
        else
          update public.matches
             set participant1_id = new.participant1_id,
                 participant2_id = new.participant2_id,
                 winner_id = null,
                 is_bye = false,
                 status = 'pending',
                 finished_at = null,
                 version = version + 1
           where id = reset_match.id;
        end if;
      end if;
    end if;
  elsif old.status = 'completed' and new.status <> 'completed' then
    if exists (
      select 1
        from public.rounds r
       where r.id = new.round_id
         and r.bracket = 'grand_final'
    ) and new.position = 1 then
      update public.matches
         set participant1_id = null,
             participant2_id = null,
             winner_id = null,
             is_bye = false,
             status = 'pending',
             score1 = 0,
             score2 = 0,
             sets1 = 0,
             sets2 = 0,
             finished_at = null,
             version = version + 1
       where round_id = new.round_id
         and position = 2
         and status <> 'completed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists route_double_elimination_progression on public.matches;
create trigger route_double_elimination_progression
after update of status, winner_id, participant1_id, participant2_id
on public.matches
for each row
execute function public.route_double_elimination_progression();

revoke all on function public.route_double_elimination_progression() from public, anon, authenticated;
