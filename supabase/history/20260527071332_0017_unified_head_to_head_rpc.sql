-- 20260527071332 0017_unified_head_to_head_rpc
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
CREATE OR REPLACE FUNCTION public.get_user_head_to_head_unified(p_user_id uuid)
RETURNS TABLE(
    opponent_user_id uuid,
    opponent_name text,
    matches integer,
    wins integer,
    losses integer,
    draws integer,
    sets_won integer,
    sets_lost integer
)
LANGUAGE sql
STABLE
AS $$
WITH
-- 클럽 매치에서 내가 참여한 경기 기본 정보
club_base AS (
    SELECT
        m.id AS match_id,
        m.match_type,
        m.winner_id,
        m.result_sets,
        m.player1_id,
        m.player2_id,
        m.team1,
        m.team2,
        CASE
            WHEN m.match_type = 'singles' AND m.player1_id = p_user_id THEN 'team1'
            WHEN m.match_type = 'singles' AND m.player2_id = p_user_id THEN 'team2'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team1, '{}')) THEN 'team1'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team2, '{}')) THEN 'team2'
        END AS my_side
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true
      AND m.status = 'finished'
      AND (
          m.player1_id = p_user_id
          OR m.player2_id = p_user_id
          OR p_user_id = ANY(COALESCE(m.team1, '{}'))
          OR p_user_id = ANY(COALESCE(m.team2, '{}'))
      )
),
-- 매치별 세트 승/패 계산
club_sets AS (
    SELECT
        cb.match_id,
        cb.my_side,
        cb.winner_id,
        COALESCE(
            (SELECT SUM(CASE WHEN cb.my_side = 'team1' THEN (s->>'team1')::int ELSE (s->>'team2')::int END)
             FROM jsonb_array_elements(COALESCE(cb.result_sets, '[]'::jsonb)) s), 0
        )::int AS sets_won,
        COALESCE(
            (SELECT SUM(CASE WHEN cb.my_side = 'team1' THEN (s->>'team2')::int ELSE (s->>'team1')::int END)
             FROM jsonb_array_elements(COALESCE(cb.result_sets, '[]'::jsonb)) s), 0
        )::int AS sets_lost
    FROM club_base cb
    WHERE cb.my_side IS NOT NULL
),
-- 상대 선수 언풀
club_vs AS (
    SELECT
        cb.match_id,
        unnest(
            CASE
                WHEN cb.match_type = 'singles' THEN
                    CASE cb.my_side
                        WHEN 'team1' THEN ARRAY[cb.player2_id]
                        ELSE ARRAY[cb.player1_id]
                    END
                ELSE
                    CASE cb.my_side
                        WHEN 'team1' THEN COALESCE(cb.team2, '{}')
                        ELSE COALESCE(cb.team1, '{}')
                    END
            END
        ) AS opp_id
    FROM club_base cb
    WHERE cb.my_side IS NOT NULL
),
-- 클럽 상대별 집계
club_agg AS (
    SELECT
        cv.opp_id AS opponent_user_id,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE cs.winner_id = cs.my_side)::int AS wins,
        COUNT(*) FILTER (WHERE cs.winner_id IS NOT NULL AND cs.winner_id <> 'draw' AND cs.winner_id <> cs.my_side)::int AS losses,
        COUNT(*) FILTER (WHERE cs.winner_id = 'draw')::int AS draws,
        COALESCE(SUM(cs.sets_won), 0)::int AS sets_won,
        COALESCE(SUM(cs.sets_lost), 0)::int AS sets_lost
    FROM club_vs cv
    JOIN club_sets cs ON cs.match_id = cv.match_id
    WHERE cv.opp_id IS NOT NULL AND cv.opp_id <> p_user_id
    GROUP BY cv.opp_id
),
-- 개인 매치 집계 (opponent_user_id 또는 opponent_name 기준)
personal_agg AS (
    SELECT
        pm.opponent_user_id,
        pm.opponent_name,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE pm.winner = 'me')::int AS wins,
        COUNT(*) FILTER (WHERE pm.winner = 'opponent')::int AS losses,
        COUNT(*) FILTER (WHERE pm.winner = 'draw')::int AS draws,
        COALESCE(SUM(
            COALESCE((SELECT SUM((s->>'me')::int) FROM jsonb_array_elements(COALESCE(pm.set_scores, '[]'::jsonb)) s), 0)
        ), 0)::int AS sets_won,
        COALESCE(SUM(
            COALESCE((SELECT SUM((s->>'opp')::int) FROM jsonb_array_elements(COALESCE(pm.set_scores, '[]'::jsonb)) s), 0)
        ), 0)::int AS sets_lost
    FROM public.personal_matches pm
    WHERE pm.user_id = p_user_id
    GROUP BY pm.opponent_user_id, pm.opponent_name
),
-- 병합: opponent_user_id가 동일한 클럽+개인 합산
matched AS (
    SELECT
        ca.opponent_user_id,
        (ca.matches + pa.matches)::int AS matches,
        (ca.wins + pa.wins)::int AS wins,
        (ca.losses + pa.losses)::int AS losses,
        (ca.draws + pa.draws)::int AS draws,
        (ca.sets_won + pa.sets_won)::int AS sets_won,
        (ca.sets_lost + pa.sets_lost)::int AS sets_lost
    FROM club_agg ca
    JOIN personal_agg pa ON pa.opponent_user_id = ca.opponent_user_id
),
-- 클럽 전용 (매칭되는 개인 매치 없음)
club_only AS (
    SELECT ca.opponent_user_id, ca.matches, ca.wins, ca.losses, ca.draws, ca.sets_won, ca.sets_lost
    FROM club_agg ca
    WHERE NOT EXISTS (SELECT 1 FROM personal_agg pa WHERE pa.opponent_user_id = ca.opponent_user_id)
),
-- 개인 전용 (user_id 있음, 클럽에 없음)
personal_user_only AS (
    SELECT pa.opponent_user_id, pa.matches, pa.wins, pa.losses, pa.draws, pa.sets_won, pa.sets_lost
    FROM personal_agg pa
    WHERE pa.opponent_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM club_agg ca WHERE ca.opponent_user_id = pa.opponent_user_id)
),
-- 개인 전용 (자유 텍스트, user_id 없음)
personal_text_only AS (
    SELECT pa.opponent_user_id, pa.opponent_name, pa.matches, pa.wins, pa.losses, pa.draws, pa.sets_won, pa.sets_lost
    FROM personal_agg pa
    WHERE pa.opponent_user_id IS NULL
),
-- 전체 합산
all_entries AS (
    SELECT opponent_user_id, NULL::text AS opp_name, matches, wins, losses, draws, sets_won, sets_lost FROM matched
    UNION ALL
    SELECT opponent_user_id, NULL::text, matches, wins, losses, draws, sets_won, sets_lost FROM club_only
    UNION ALL
    SELECT opponent_user_id, NULL::text, matches, wins, losses, draws, sets_won, sets_lost FROM personal_user_only
    UNION ALL
    SELECT opponent_user_id, opponent_name, matches, wins, losses, draws, sets_won, sets_lost FROM personal_text_only
)
SELECT
    ae.opponent_user_id,
    COALESCE(u.name, ae.opp_name) AS opponent_name,
    ae.matches,
    ae.wins,
    ae.losses,
    ae.draws,
    ae.sets_won,
    ae.sets_lost
FROM all_entries ae
LEFT JOIN public.users u ON u.id = ae.opponent_user_id
ORDER BY ae.matches DESC;
$$;
