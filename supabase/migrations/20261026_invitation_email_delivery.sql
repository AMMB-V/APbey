-- Tracks the result of the transactional invitation email.
alter table public.invitations
  add column if not exists email_status text not null default 'not_sent'
    check (email_status in ('not_sent', 'sent', 'failed')),
  add column if not exists email_message_id text,
  add column if not exists email_error text,
  add column if not exists email_sent_at timestamptz;

create index if not exists invitations_email_status_idx
  on public.invitations (email_status);
