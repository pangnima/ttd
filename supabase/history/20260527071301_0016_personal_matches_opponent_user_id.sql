-- 20260527071301 0016_personal_matches_opponent_user_id
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
ALTER TABLE public.personal_matches
    ADD COLUMN opponent_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX idx_personal_matches_opponent_user_id
    ON public.personal_matches(opponent_user_id)
    WHERE opponent_user_id IS NOT NULL;
