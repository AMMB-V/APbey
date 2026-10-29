-- Authorization helpers are called by RLS policies and SECURITY DEFINER
-- functions; they are not part of the anonymous client RPC surface. PostgreSQL
-- checks EXECUTE privileges when evaluating an RLS policy, so authenticated
-- must retain EXECUTE even though these helpers are not intended as API RPCs.
revoke all on function public.can_read_tournament(uuid) from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_organizer() from public, anon;
revoke all on function public.manages_tournament(uuid) from public, anon;
revoke all on function public.referees_match(uuid) from public, anon;

grant execute on function public.can_read_tournament(uuid) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_organizer() to authenticated;
grant execute on function public.manages_tournament(uuid) to authenticated;
grant execute on function public.referees_match(uuid) to authenticated;
