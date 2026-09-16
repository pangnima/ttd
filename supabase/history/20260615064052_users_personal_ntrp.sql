-- 20260615064052 users_personal_ntrp
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.users
  add column personal_ntrp numeric
  check (personal_ntrp is null or (personal_ntrp >= 1.0 and personal_ntrp <= 7.0));
