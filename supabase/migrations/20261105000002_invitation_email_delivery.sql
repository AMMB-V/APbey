-- Invitations and transactional email delivery state.
create table if not exists public.invitations (
  id text primary key,
  email text not null,
  role user_role not null,
  tournament_id text,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invited_by text not null,
  code text unique not null,
  created_at timestamptz not null default now(),
  email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed')),
  email_message_id text,
  email_error text,
  email_sent_at timestamptz
);

alter table public.invitations enable row level security;

drop policy if exists invitations_admin_read on public.invitations;
create policy invitations_admin_read on public.invitations
  for select using (is_admin());

drop policy if exists invitations_admin_insert on public.invitations;
create policy invitations_admin_insert on public.invitations
  for insert with check (is_admin() and invited_by = auth.uid()::text);

drop policy if exists invitations_admin_update on public.invitations;
create policy invitations_admin_update on public.invitations
  for update using (is_admin()) with check (is_admin());

drop policy if exists invitations_claim_update on public.invitations;
create policy invitations_claim_update on public.invitations
  for update using (
    auth.uid() is not null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) with check (status in ('accepted', 'revoked'));

alter table public.invitations
  add column if not exists email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed')),
  add column if not exists email_message_id text,
  add column if not exists email_error text,
  add column if not exists email_sent_at timestamptz;

create index if not exists invitations_email_status_idx
  on public.invitations (email_status);

create index if not exists invitations_code_idx
  on public.invitations (code);
