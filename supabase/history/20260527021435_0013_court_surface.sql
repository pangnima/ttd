-- 20260527021435 0013_court_surface
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
ALTER TABLE match_game_courts
ADD COLUMN surface text NULL
CONSTRAINT match_game_courts_surface_check
CHECK (surface IN ('hard', 'clay', 'indoor', 'omni'));
