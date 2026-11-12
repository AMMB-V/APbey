-- Clear self-referencing match links before deleting tournament matches.
-- PostgreSQL otherwise rejects deletion because next_match_* still references
-- another match in the same tournament.
create or replace function public.delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_organizer uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select organizer_id
    into tournament_organizer
    from public.tournaments
   where id = p_tournament_id
   for update;

  if not found then
    raise exception 'tournament_not_found';
  end if;

  if not (public.is_admin() or tournament_organizer = auth.uid()) then
    raise exception 'forbidden';
  end if;

  insert into public.deleted_tournaments (id, deleted_by)
  values (p_tournament_id, auth.uid())
  on conflict (id) do update
    set deleted_at = now(), deleted_by = excluded.deleted_by;

  delete from public.penalties p
   using public.matches m
   where p.match_id = m.id
     and m.tournament_id = p_tournament_id;

  delete from public.battles b
   using public.matches m
   where b.match_id = m.id
     and m.tournament_id = p_tournament_id;

  update public.matches
     set next_match_winner_id = null,
         next_match_loser_id = null
   where tournament_id = p_tournament_id;

  delete from public.matches
   where tournament_id = p_tournament_id;

  delete from public.participants
   where tournament_id = p_tournament_id;

  delete from public.tournaments
   where id = p_tournament_id;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public, anon;
grant execute on function public.delete_tournament(uuid) to authenticated;
