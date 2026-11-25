-- Prevent zombie connections from blocking the PostgREST connection pool.
-- idle_in_transaction_session_timeout: auto-cancels stuck transactions after 30s
-- statement_timeout on publish_tournament_snapshot: breaks loops that hammer the RPC

ALTER ROLE authenticator SET idle_in_transaction_session_timeout = '30s';

ALTER FUNCTION public.publish_tournament_snapshot(
  p_tournament jsonb,
  p_finish_points jsonb,
  p_referees jsonb,
  p_participants jsonb,
  p_stages jsonb,
  p_groups jsonb,
  p_group_participants jsonb,
  p_rounds jsonb,
  p_matches jsonb,
  p_battles jsonb,
  p_penalties jsonb
) SET statement_timeout = '10s';
