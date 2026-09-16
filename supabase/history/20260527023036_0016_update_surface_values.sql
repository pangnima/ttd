-- 20260527023036 0016_update_surface_values
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
ALTER TABLE match_game_courts
    DROP CONSTRAINT IF EXISTS match_game_courts_surface_check;
ALTER TABLE match_game_courts
    ADD CONSTRAINT match_game_courts_surface_check
    CHECK (surface IN ('hard', 'clay', 'grass', 'other'));

ALTER TABLE personal_matches
    DROP CONSTRAINT IF EXISTS personal_matches_surface_check;
ALTER TABLE personal_matches
    ADD CONSTRAINT personal_matches_surface_check
    CHECK (surface IN ('hard', 'clay', 'grass', 'other'));
