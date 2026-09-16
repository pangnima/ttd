-- 20260615064047 personal_match_drop_match_level_ad
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
alter table public.personal_matches
  drop column my_ad_player,
  drop column opponent_ad_player;
