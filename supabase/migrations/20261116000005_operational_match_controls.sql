-- Operational fields for audited outcomes, decks, and authorized reopening.
alter table public.participants
  add column if not exists deck_combos text[] not null default '{}';

alter table public.matches
  add column if not exists outcome text
    check (outcome is null or outcome in ('normal', 'walkover', 'disqualification', 'abandonment', 'third_place')),
  add column if not exists outcome_note text,
  add column if not exists reopened_at timestamptz,
  add column if not exists reopened_by uuid references auth.users(id),
  add column if not exists reopen_reason text;

create or replace function public.reopen_match(
  p_match_id uuid,
  p_expected_version int,
  p_reason text
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_actor_role text;
  v_previous jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'reopen_reason_required';
  end if;

  select role into v_actor_role
    from public.profiles
   where id = auth.uid();
  if v_actor_role not in ('admin', 'organizer', 'referee') then
    raise exception 'FORBIDDEN';
  end if;

  select *
    into v_match
    from public.matches
   where id = p_match_id
   for update;
  if not found then raise exception 'match_not_found'; end if;
  if v_match.version <> p_expected_version then
    raise exception 'version_conflict';
  end if;
  if v_match.status <> 'completed' then
    raise exception 'match_not_completed';
  end if;
  if v_actor_role = 'referee'
     and not exists (
       select 1 from public.matches m
        where m.id = p_match_id and m.referee_id = auth.uid()
     ) then
    raise exception 'FORBIDDEN';
  end if;

  v_previous := to_jsonb(v_match);
  update public.matches
     set winner_id = null,
         is_draw = false,
         score1 = 0,
         score2 = 0,
         sets1 = 0,
         sets2 = 0,
         status = 'pending',
         outcome = null,
         outcome_note = null,
         reopened_at = now(),
         reopened_by = auth.uid(),
         reopen_reason = trim(p_reason),
         finished_at = null,
         version = version + 1
   where id = p_match_id
   returning * into v_match;

  insert into public.audit_log (
    table_name, record_id, action, old_data, new_data, actor
  )
  values (
    'matches', p_match_id, 'reopen', v_previous, to_jsonb(v_match), auth.uid()
  );

  return v_match;
end;
$$;

revoke all on function public.reopen_match(uuid, int, text) from public, anon;
grant execute on function public.reopen_match(uuid, int, text) to authenticated;
