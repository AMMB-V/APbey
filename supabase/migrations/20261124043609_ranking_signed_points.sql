-- Ranking totals can be negative after penalties and point differentials.
alter table public.ranking_entries drop constraint if exists ranking_entries_points_check;
