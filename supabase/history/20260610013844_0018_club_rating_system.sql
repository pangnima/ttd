-- 20260610013844 0018_club_rating_system
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- 0018_club_rating_system: 클럽별 동적 레이팅(클럽 NTRP)
-- 명세: docs/rating-system.md

CREATE TABLE IF NOT EXISTS public.club_player_ratings (
    club_id        uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating         numeric NOT NULL DEFAULT 2.5,
    matches_played integer NOT NULL DEFAULT 0,
    updated_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (club_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.club_rating_history (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id       uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    match_id      uuid REFERENCES public.match_game_matches(id) ON DELETE SET NULL,
    rating_before numeric NOT NULL,
    rating_after  numeric NOT NULL,
    delta         numeric NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS club_rating_history_lookup_idx
    ON public.club_rating_history (club_id, user_id, created_at);

ALTER TABLE public.club_player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_rating_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_player_ratings_select ON public.club_player_ratings;
CREATE POLICY club_player_ratings_select ON public.club_player_ratings
    FOR SELECT USING (is_club_approved_member(club_id, auth.uid()));

DROP POLICY IF EXISTS club_rating_history_select ON public.club_rating_history;
CREATE POLICY club_rating_history_select ON public.club_rating_history
    FOR SELECT USING (is_club_approved_member(club_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.apply_club_rating_snapshot(
    p_club_id  uuid,
    p_snapshot jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller uuid := auth.uid();
BEGIN
    IF NOT is_club_owner(p_club_id, v_caller) THEN
        RAISE EXCEPTION 'permission denied: not a club owner';
    END IF;

    DELETE FROM club_rating_history WHERE club_id = p_club_id;
    DELETE FROM club_player_ratings WHERE club_id = p_club_id;

    INSERT INTO club_player_ratings (club_id, user_id, rating, matches_played, updated_at)
    SELECT
        p_club_id,
        (elem->>'user_id')::uuid,
        (elem->>'rating')::numeric,
        (elem->>'matches_played')::int,
        now()
    FROM jsonb_array_elements(COALESCE(p_snapshot->'ratings', '[]'::jsonb)) AS elem;

    INSERT INTO club_rating_history
        (club_id, user_id, match_id, rating_before, rating_after, delta, created_at)
    SELECT
        p_club_id,
        (elem->>'user_id')::uuid,
        NULLIF(elem->>'match_id', '')::uuid,
        (elem->>'rating_before')::numeric,
        (elem->>'rating_after')::numeric,
        (elem->>'delta')::numeric,
        COALESCE((elem->>'created_at')::timestamptz, now())
    FROM jsonb_array_elements(COALESCE(p_snapshot->'history', '[]'::jsonb)) AS elem;
END;
$function$;
