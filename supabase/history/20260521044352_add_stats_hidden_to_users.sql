-- 20260521044352 add_stats_hidden_to_users
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.users
  add column stats_hidden boolean not null default false;
