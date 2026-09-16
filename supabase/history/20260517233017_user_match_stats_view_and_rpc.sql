-- 20260517233017 user_match_stats_view_and_rpc
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- 경기 참여 행을 단식/복식 모두 펼치는 view
-- security_invoker=true: 호출자 권한으로 RLS 적용
CREATE VIEW user_match_participations WITH (security_invoker=on) AS
    -- 단식 player1
    SELECT
        m.id          AS match_id,
        m.match_type,
        m.player1_id  AS user_id,
        (m.winner_id = 'team1') AS won
    FROM match_game_matches m
    WHERE m.match_type = 'singles'
      AND m.status = 'finished'
      AND m.player1_id IS NOT NULL

    UNION ALL

    -- 단식 player2
    SELECT
        m.id,
        m.match_type,
        m.player2_id,
        (m.winner_id = 'team2')
    FROM match_game_matches m
    WHERE m.match_type = 'singles'
      AND m.status = 'finished'
      AND m.player2_id IS NOT NULL

    UNION ALL

    -- 복식 team1
    SELECT
        m.id,
        m.match_type,
        unnest(m.team1),
        (m.winner_id = 'team1')
    FROM match_game_matches m
    WHERE m.match_type <> 'singles'
      AND m.status = 'finished'
      AND m.team1 IS NOT NULL

    UNION ALL

    -- 복식 team2
    SELECT
        m.id,
        m.match_type,
        unnest(m.team2),
        (m.winner_id = 'team2')
    FROM match_game_matches m
    WHERE m.match_type <> 'singles'
      AND m.status = 'finished'
      AND m.team2 IS NOT NULL;

GRANT SELECT ON user_match_participations TO authenticated;

-- 단식/복식 분리 통계 RPC
CREATE FUNCTION get_user_match_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
    SELECT jsonb_build_object(
        'singles', (
            SELECT jsonb_build_object(
                'matches', COUNT(*)::int,
                'wins',    COUNT(*) FILTER (WHERE won)::int,
                'losses',  COUNT(*) FILTER (WHERE NOT won)::int
            )
            FROM user_match_participations
            WHERE user_id = p_user_id
              AND match_type = 'singles'
        ),
        'doubles', (
            SELECT jsonb_build_object(
                'matches', COUNT(*)::int,
                'wins',    COUNT(*) FILTER (WHERE won)::int,
                'losses',  COUNT(*) FILTER (WHERE NOT won)::int
            )
            FROM user_match_participations
            WHERE user_id = p_user_id
              AND match_type <> 'singles'
        )
    );
$$;

REVOKE EXECUTE ON FUNCTION get_user_match_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_match_stats(uuid) TO authenticated;

-- 상대별 단식 전적 RPC
CREATE FUNCTION get_user_head_to_head(p_user_id uuid)
RETURNS TABLE(opponent_id uuid, matches int, wins int, losses int)
LANGUAGE sql STABLE SECURITY INVOKER
AS $$
    WITH me AS (
        SELECT match_id, won
        FROM user_match_participations
        WHERE user_id = p_user_id
          AND match_type = 'singles'
    ),
    opp AS (
        SELECT p.match_id, p.user_id AS opponent_id
        FROM user_match_participations p
        JOIN me ON me.match_id = p.match_id
        WHERE p.user_id <> p_user_id
          AND p.match_type = 'singles'
    )
    SELECT
        opp.opponent_id,
        COUNT(*)::int                              AS matches,
        COUNT(*) FILTER (WHERE me.won)::int        AS wins,
        COUNT(*) FILTER (WHERE NOT me.won)::int    AS losses
    FROM opp
    JOIN me USING (match_id)
    GROUP BY opp.opponent_id
    ORDER BY matches DESC;
$$;

REVOKE EXECUTE ON FUNCTION get_user_head_to_head(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_head_to_head(uuid) TO authenticated;

