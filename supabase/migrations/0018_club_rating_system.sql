-- ============================================================
-- 0018_club_rating_system.sql
-- 목적: 클럽별 동적 레이팅(클럽 NTRP) 도입.
--   알고리즘·데이터 모델 단일 진실: docs/rating-system.md
--
-- 포함 객체:
--   Table : club_player_ratings   (club_id, user_id) → 레이팅/경기 수. 게스트 포함.
--   Table : club_rating_history   경기별 변동 이력 (추세/감사용)
--   RPC   : apply_club_rating_snapshot(p_club_id, p_snapshot)
--           전체 재계산 결과를 owner 권한으로 원자적 재작성 (SECURITY DEFINER)
--
-- 주의: 레이팅 계산은 애플리케이션(lib/rating/elo.ts)의 순수 함수가 담당하고,
--       이 RPC는 영속화만 한다. 클라이언트 직접 쓰기는 RLS로 차단.
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- Table: club_player_ratings
-- (club_id, user_id) 단위의 현재 클럽 레이팅. 경기 없는 멤버는 행이 없을 수 있고
-- 조회 계층에서 기본값 2.5 로 coalesce 한다.
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.club_player_ratings (
    club_id        uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating         numeric NOT NULL DEFAULT 2.5,
    matches_played integer NOT NULL DEFAULT 0,
    updated_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (club_id, user_id)
);

-- ──────────────────────────────────────────────────────────────
-- Table: club_rating_history
-- 확정 경기별 레이팅 변동 이력. created_at 은 경기 시점(date) 복제로 정렬에 쓴다.
-- ──────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────
-- RLS: approved 멤버만 SELECT. 쓰기는 SECURITY DEFINER RPC 로만.
-- ──────────────────────────────────────────────────────────────
ALTER TABLE public.club_player_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_rating_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS club_player_ratings_select ON public.club_player_ratings;
CREATE POLICY club_player_ratings_select ON public.club_player_ratings
    FOR SELECT USING (is_club_approved_member(club_id, auth.uid()));

DROP POLICY IF EXISTS club_rating_history_select ON public.club_rating_history;
CREATE POLICY club_rating_history_select ON public.club_rating_history
    FOR SELECT USING (is_club_approved_member(club_id, auth.uid()));

-- ──────────────────────────────────────────────────────────────
-- RPC: apply_club_rating_snapshot
-- 전체 재계산 스냅샷을 한 트랜잭션에 원자적으로 반영한다.
-- p_snapshot 구조:
--   {
--     "ratings": [ { "user_id": uuid, "rating": number, "matches_played": int }, ... ],
--     "history": [ { "match_id": uuid, "user_id": uuid,
--                    "rating_before": number, "rating_after": number,
--                    "delta": number, "created_at": timestamptz? }, ... ]
--   }
-- 권한: 호출자가 해당 클럽 owner 여야 한다.
-- ──────────────────────────────────────────────────────────────
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

    -- 해당 클럽의 기존 레이팅/이력을 전부 비우고 스냅샷으로 재작성.
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
