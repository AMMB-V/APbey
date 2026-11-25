create function public.apply_referee_assignments(p_tournament uuid, p_stages jsonb, p_groups jsonb, p_release uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare item record;
begin
  if auth.uid() is null or public.manages_tournament(p_tournament) is not true then raise exception 'forbidden'; end if;
  perform 1 from public.tournaments where id=p_tournament for update;
  if p_release is not null then
    update public.matches set referee_id=null, version=version+1
      where tournament_id=p_tournament and referee_id=p_release and status<>'completed';
    update public.groups g set referee_id=null from public.stages s
      where g.stage_id=s.id and s.tournament_id=p_tournament and g.referee_id=p_release;
    update public.stages set config=config-'head_referee_id'
      where tournament_id=p_tournament and config->>'head_referee_id'=p_release::text;
    delete from public.tournament_referees where tournament_id=p_tournament and profile_id=p_release;
  end if;
  for item in select key::uuid as id, value::uuid as official, true as stage from jsonb_each_text(p_stages)
              union all select key::uuid, value::uuid, false from jsonb_each_text(p_groups)
  loop
    if item.official is not null and not exists (
      select 1 from public.profiles where id=item.official and role in ('organizer','referee')
    ) then raise exception 'invalid_official'; end if;
    if item.stage then
      update public.stages set config=case when item.official is null then config-'head_referee_id'
        else jsonb_set(coalesce(config,'{}'),'{head_referee_id}',to_jsonb(item.official)) end
        where id=item.id and tournament_id=p_tournament;
      if not found then raise exception 'invalid_stage'; end if;
      update public.groups set referee_id=item.official where stage_id=item.id;
    else
      update public.groups g set referee_id=item.official from public.stages s
        where g.id=item.id and s.id=g.stage_id and s.tournament_id=p_tournament;
      if not found then raise exception 'invalid_group'; end if;
    end if;
    update public.matches set referee_id=item.official,version=version+1
      where tournament_id=p_tournament and status<>'completed'
        and ((item.stage and stage_id=item.id) or (not item.stage and group_id=item.id));
    if item.official is not null then
      insert into public.tournament_referees(tournament_id,profile_id)
        values(p_tournament,item.official) on conflict do nothing;
    end if;
  end loop;
  insert into public.audit_log(table_name,record_id,action,actor)
    values ('tournament_referees',p_tournament,'update',auth.uid());
end $$;
revoke all on function public.apply_referee_assignments(uuid,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.apply_referee_assignments(uuid,jsonb,jsonb,uuid) to authenticated;

create function public.list_eligible_officials()
returns table(id uuid,display_name text,role public.user_role)
language sql stable security definer set search_path='' as $$
  select p.id,p.display_name,p.role from public.profiles p
  where (public.is_admin() or public.is_organizer()) and p.role in ('organizer','referee')
  order by p.display_name,p.id
$$;
revoke all on function public.list_eligible_officials() from public,anon;
grant execute on function public.list_eligible_officials() to authenticated;

do $$
declare relation text;
begin
  foreach relation in array array['group_participants','tournament_referees','tournament_finish_points'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename=relation) then
      execute format('alter publication supabase_realtime add table public.%I',relation);
    end if;
  end loop;
end $$;
