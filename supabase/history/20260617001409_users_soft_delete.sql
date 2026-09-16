-- 20260617001409 users_soft_delete
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.users
  add column deleted_at timestamptz;
