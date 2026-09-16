-- 20260615001026 personal_match_played_time
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.personal_matches
  add column played_time time;
