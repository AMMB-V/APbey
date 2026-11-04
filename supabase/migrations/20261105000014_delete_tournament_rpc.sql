-- Delete a tournament and its relational tree atomically.
-- Child tables reference the tournament hierarchy with ON DELETE CASCADE.
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

  delete from public.tournaments
   where id = p_tournament_id;
end;
$$;

revoke all on function public.delete_tournament(uuid) from public, anon;
grant execute on function public.delete_tournament(uuid) to authenticated;
