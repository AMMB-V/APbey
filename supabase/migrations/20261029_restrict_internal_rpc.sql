-- Authorization helpers are called by RLS policies and SECURITY DEFINER
-- functions; they are not part of the public client RPC surface.
revoke all on function public.can_read_tournament(uuid) from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon, authenticated;
revoke all on function public.is_organizer() from public, anon, authenticated;
revoke all on function public.manages_tournament(uuid) from public, anon, authenticated;
revoke all on function public.referees_match(uuid) from public, anon, authenticated;
