-- 20260518051706 add_court_sides_to_match_game_matches
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
ALTER TABLE match_game_matches
    ADD COLUMN IF NOT EXISTS team1_ad_player_id UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS team2_ad_player_id UUID REFERENCES users(id);
