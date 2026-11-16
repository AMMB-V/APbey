-- Idempotency and request correlation for critical referee mutations.
-- The table is private to SECURITY DEFINER wrappers and is never exposed
-- directly through the client-facing API.
create table if not exists public.mutation_idempotency (
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  operation text not null,
  request_id uuid not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

alter table public.mutation_idempotency enable row level security;
revoke all on public.mutation_idempotency from public, anon, authenticated;

create index if not exists mutation_idempotency_created_at_idx
  on public.mutation_idempotency (created_at);

create or replace function public.record_battle_idempotent(
  p_match uuid,
  p_scorer uuid,
  p_finish finish_type,
  p_expected_version int,
  p_idempotency_key text,
  p_request_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_response jsonb;
  v_operation text;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  insert into public.mutation_idempotency (
    user_id, idempotency_key, operation, request_id
  )
  values (auth.uid(), p_idempotency_key, 'record_battle', p_request_id)
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  if not v_inserted then
    select operation, response
      into v_operation, v_response
      from public.mutation_idempotency
     where user_id = auth.uid()
       and idempotency_key = p_idempotency_key
     for update;
    if v_operation <> 'record_battle' then raise exception 'idempotency_key_reused'; end if;
    if v_response is null then raise exception 'idempotency_in_progress'; end if;
    return jsonb_populate_record(null::public.matches, v_response);
  end if;

  select public.record_battle(
    p_match, p_scorer, p_finish, p_expected_version
  )
  into v_match;

  update public.mutation_idempotency
     set response = to_jsonb(v_match)
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key;

  return v_match;
end;
$$;

create or replace function public.record_penalty_idempotent(
  p_match_id uuid,
  p_offender_id uuid,
  p_card card_type,
  p_is_foul boolean,
  p_points_awarded int,
  p_awarded_to uuid,
  p_reason text,
  p_issued_by uuid,
  p_expected_version int,
  p_idempotency_key text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_response jsonb;
  v_result jsonb;
  v_operation text;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  insert into public.mutation_idempotency (
    user_id, idempotency_key, operation, request_id
  )
  values (auth.uid(), p_idempotency_key, 'record_penalty', p_request_id)
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  if not v_inserted then
    select operation, response
      into v_operation, v_response
      from public.mutation_idempotency
     where user_id = auth.uid()
       and idempotency_key = p_idempotency_key
     for update;
    if v_operation <> 'record_penalty' then raise exception 'idempotency_key_reused'; end if;
    if v_response is null then raise exception 'idempotency_in_progress'; end if;
    return v_response;
  end if;

  v_result := public.record_penalty(
    p_match_id, p_offender_id, p_card, p_is_foul, p_points_awarded,
    p_awarded_to, p_reason, p_issued_by, p_expected_version
  );

  update public.mutation_idempotency
     set response = v_result
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key;

  return v_result;
end;
$$;

create or replace function public.undo_last_battle_idempotent(
  p_match_id uuid,
  p_expected_version int,
  p_idempotency_key text,
  p_request_id uuid
)
returns public.matches
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_match public.matches;
  v_response jsonb;
  v_operation text;
  v_inserted boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(trim(coalesce(p_idempotency_key, ''))) < 8 then
    raise exception 'invalid_idempotency_key';
  end if;

  insert into public.mutation_idempotency (
    user_id, idempotency_key, operation, request_id
  )
  values (auth.uid(), p_idempotency_key, 'undo_last_battle', p_request_id)
  on conflict (user_id, idempotency_key) do nothing;

  v_inserted := found;
  if not v_inserted then
    select operation, response
      into v_operation, v_response
      from public.mutation_idempotency
     where user_id = auth.uid()
       and idempotency_key = p_idempotency_key
     for update;
    if v_operation <> 'undo_last_battle' then raise exception 'idempotency_key_reused'; end if;
    if v_response is null then raise exception 'idempotency_in_progress'; end if;
    return jsonb_populate_record(null::public.matches, v_response);
  end if;

  select public.undo_last_battle(p_match_id, p_expected_version)
    into v_match;

  update public.mutation_idempotency
     set response = to_jsonb(v_match)
   where user_id = auth.uid()
     and idempotency_key = p_idempotency_key;

  return v_match;
end;
$$;

revoke all on function public.record_battle_idempotent(
  uuid, uuid, finish_type, integer, text, uuid
) from public, anon;
revoke all on function public.record_penalty_idempotent(
  uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer, text, uuid
) from public, anon;
revoke all on function public.undo_last_battle_idempotent(
  uuid, integer, text, uuid
) from public, anon;

grant execute on function public.record_battle_idempotent(
  uuid, uuid, finish_type, integer, text, uuid
) to authenticated;
grant execute on function public.record_penalty_idempotent(
  uuid, uuid, card_type, boolean, integer, uuid, text, uuid, integer, text, uuid
) to authenticated;
grant execute on function public.undo_last_battle_idempotent(
  uuid, integer, text, uuid
) to authenticated;
