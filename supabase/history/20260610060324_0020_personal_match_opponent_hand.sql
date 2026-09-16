-- 20260610060324 0020_personal_match_opponent_hand
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.personal_matches
  add column opponent_dominant_hand text
  check (opponent_dominant_hand in ('right', 'left'));
