-- RLS policies invoke these SECURITY DEFINER helpers as the authenticated
-- caller. Keep them unavailable to anonymous/public callers while preserving
-- the EXECUTE privilege required for policy evaluation.
grant execute on function public.can_read_tournament(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_organizer() to authenticated;
grant execute on function public.manages_tournament(uuid) to authenticated;
grant execute on function public.referees_match(uuid) to authenticated;

revoke execute on function public.can_read_tournament(uuid) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_organizer() from public, anon;
revoke execute on function public.manages_tournament(uuid) from public, anon;
revoke execute on function public.referees_match(uuid) from public, anon;
