-- 20260616062007 0028_club_court_schedule
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 클럽 정기 활동(고정코트) 시간. 자유 텍스트 1줄.
alter table public.clubs
  add column court_schedule text;
