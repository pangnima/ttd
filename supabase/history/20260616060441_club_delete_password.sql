-- 20260616060441 club_delete_password
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.clubs
  add column delete_password_hash text;
