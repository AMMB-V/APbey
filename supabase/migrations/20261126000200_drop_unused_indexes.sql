-- Optimization: drop unused indexes to reduce write overhead on tournament tables.
-- All 13 indexes had idx_scan = 0 as of 2026-11-25.
-- FK-based indexes for joins (group_id, stage_id) are retained via existing PKs.

DROP INDEX IF EXISTS public.idx_matches_referee_active;
DROP INDEX IF EXISTS public.invitations_email_status_idx;
DROP INDEX IF EXISTS public.invitations_code_idx;
DROP INDEX IF EXISTS public.mutation_idempotency_created_at_idx;
DROP INDEX IF EXISTS public.battles_recorded_by_idx;
DROP INDEX IF EXISTS public.group_participants_participant_id_idx;
DROP INDEX IF EXISTS public.groups_referee_id_idx;
DROP INDEX IF EXISTS public.participants_profile_id_idx;
DROP INDEX IF EXISTS public.penalties_issued_by_idx;
DROP INDEX IF EXISTS public.rounds_group_id_idx;
DROP INDEX IF EXISTS public.tournament_referees_profile_id_idx;
DROP INDEX IF EXISTS public.deleted_tournaments_deleted_by_idx;
DROP INDEX IF EXISTS public.matches_reopened_by_idx;
