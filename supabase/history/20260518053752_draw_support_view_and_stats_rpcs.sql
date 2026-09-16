-- 20260518053752 draw_support_view_and_stats_rpcs
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 1. user_match_participations 뷰 재정의
DROP VIEW IF EXISTS user_match_participations;
CREATE VIEW user_match_participations AS
  SELECT m.id AS match_id,
         m.match_type,
         m.player1_id AS user_id,
         CASE WHEN m.winner_id = 'team1' THEN 'win'
              WHEN m.winner_id = 'team2' THEN 'loss'
              WHEN m.winner_id = 'draw'  THEN 'draw'
              ELSE NULL END AS result
    FROM match_game_matches m
   WHERE m.match_type = 'singles' AND m.status = 'finished' AND m.player1_id IS NOT NULL
UNION ALL
  SELECT m.id, m.match_type, m.player2_id,
         CASE WHEN m.winner_id = 'team2' THEN 'win'
              WHEN m.winner_id = 'team1' THEN 'loss'
              WHEN m.winner_id = 'draw'  THEN 'draw'
              ELSE NULL END
    FROM match_game_matches m
   WHERE m.match_type = 'singles' AND m.status = 'finished' AND m.player2_id IS NOT NULL
UNION ALL
  SELECT m.id, m.match_type, unnest(m.team1),
         CASE WHEN m.winner_id = 'team1' THEN 'win'
              WHEN m.winner_id = 'team2' THEN 'loss'
              WHEN m.winner_id = 'draw'  THEN 'draw'
              ELSE NULL END
    FROM match_game_matches m
   WHERE m.match_type <> 'singles' AND m.status = 'finished' AND m.team1 IS NOT NULL
UNION ALL
  SELECT m.id, m.match_type, unnest(m.team2),
         CASE WHEN m.winner_id = 'team2' THEN 'win'
              WHEN m.winner_id = 'team1' THEN 'loss'
              WHEN m.winner_id = 'draw'  THEN 'draw'
              ELSE NULL END
    FROM match_game_matches m
   WHERE m.match_type <> 'singles' AND m.status = 'finished' AND m.team2 IS NOT NULL;

-- 2. get_user_match_stats: draws 추가
CREATE OR REPLACE FUNCTION get_user_match_stats(p_user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'singles', (
            SELECT jsonb_build_object(
                'matches', COUNT(*)::int,
                'wins',    COUNT(*) FILTER (WHERE result = 'win')::int,
                'losses',  COUNT(*) FILTER (WHERE result = 'loss')::int,
                'draws',   COUNT(*) FILTER (WHERE result = 'draw')::int
            )
            FROM user_match_participations
            WHERE user_id = p_user_id AND match_type = 'singles'
        ),
        'doubles', (
            SELECT jsonb_build_object(
                'matches', COUNT(*)::int,
                'wins',    COUNT(*) FILTER (WHERE result = 'win')::int,
                'losses',  COUNT(*) FILTER (WHERE result = 'loss')::int,
                'draws',   COUNT(*) FILTER (WHERE result = 'draw')::int
            )
            FROM user_match_participations
            WHERE user_id = p_user_id AND match_type <> 'singles'
        )
    );
$$;

-- 3. get_user_head_to_head: 반환타입 변경을 위해 DROP 후 재생성
DROP FUNCTION IF EXISTS get_user_head_to_head(uuid);
CREATE FUNCTION get_user_head_to_head(p_user_id uuid)
RETURNS TABLE(opponent_id uuid, matches integer, wins integer, losses integer, draws integer)
LANGUAGE sql STABLE AS $$
    WITH me AS (
        SELECT match_id, result
        FROM user_match_participations
        WHERE user_id = p_user_id AND match_type = 'singles'
    ),
    opp AS (
        SELECT p.match_id, p.user_id AS opponent_id
        FROM user_match_participations p
        JOIN me ON me.match_id = p.match_id
        WHERE p.user_id <> p_user_id AND p.match_type = 'singles'
    )
    SELECT
        opp.opponent_id,
        COUNT(*)::int                                       AS matches,
        COUNT(*) FILTER (WHERE me.result = 'win')::int     AS wins,
        COUNT(*) FILTER (WHERE me.result = 'loss')::int    AS losses,
        COUNT(*) FILTER (WHERE me.result = 'draw')::int    AS draws
    FROM opp
    JOIN me USING (match_id)
    GROUP BY opp.opponent_id
    ORDER BY matches DESC;
$$;

