-- 20260529065006 club_win_rate_ranking_split_doubles
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

CREATE OR REPLACE FUNCTION public.get_club_win_rate_ranking(
    p_club_id uuid,
    p_min_matches int DEFAULT 3
)
RETURNS TABLE(
    match_type_group text,
    user_id uuid,
    match_count bigint,
    win_count bigint,
    loss_count bigint,
    win_rate numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH club_matches AS (
    SELECT
        m.id,
        m.match_type,
        m.player1_id,
        m.player2_id,
        m.team1,
        m.team2,
        m.winner_id
    FROM match_game_matches m
    JOIN match_games mg ON mg.id = m.match_game_id
    WHERE mg.club_id = p_club_id
      AND mg.is_fixed = true
      AND m.status = 'finished'
),
participants AS (
    SELECT 'singles'::text AS match_type_group,
           player1_id AS uid,
           CASE WHEN winner_id = 'team1' THEN 1 ELSE 0 END AS win,
           CASE WHEN winner_id = 'team2' THEN 1 ELSE 0 END AS loss
    FROM club_matches WHERE match_type = 'singles' AND player1_id IS NOT NULL

    UNION ALL

    SELECT 'singles'::text,
           player2_id,
           CASE WHEN winner_id = 'team2' THEN 1 ELSE 0 END,
           CASE WHEN winner_id = 'team1' THEN 1 ELSE 0 END
    FROM club_matches WHERE match_type = 'singles' AND player2_id IS NOT NULL

    UNION ALL

    SELECT match_type::text AS match_type_group,
           unnest(team1) AS uid,
           CASE WHEN winner_id = 'team1' THEN 1 ELSE 0 END,
           CASE WHEN winner_id = 'team2' THEN 1 ELSE 0 END
    FROM club_matches
    WHERE match_type IN ('men_doubles', 'women_doubles', 'mixed_doubles') AND team1 IS NOT NULL

    UNION ALL

    SELECT match_type::text,
           unnest(team2),
           CASE WHEN winner_id = 'team2' THEN 1 ELSE 0 END,
           CASE WHEN winner_id = 'team1' THEN 1 ELSE 0 END
    FROM club_matches
    WHERE match_type IN ('men_doubles', 'women_doubles', 'mixed_doubles') AND team2 IS NOT NULL
),
all_stats AS (
    SELECT
        match_type_group,
        uid AS user_id,
        COUNT(*) AS match_count,
        SUM(win)  AS win_count,
        SUM(loss) AS loss_count
    FROM participants
    GROUP BY match_type_group, uid
    HAVING COUNT(*) >= p_min_matches
),
ranked AS (
    SELECT
        s.match_type_group,
        s.user_id,
        s.match_count,
        s.win_count,
        s.loss_count,
        CASE WHEN s.win_count + s.loss_count = 0 THEN 0
             ELSE ROUND(s.win_count * 100.0 / (s.win_count + s.loss_count), 1)
        END AS win_rate,
        RANK() OVER (
            PARTITION BY s.match_type_group
            ORDER BY
                CASE WHEN s.win_count + s.loss_count = 0 THEN 0
                     ELSE s.win_count * 100.0 / (s.win_count + s.loss_count)
                END DESC,
                s.match_count DESC
        ) AS rnk
    FROM all_stats s
)
SELECT
    match_type_group,
    user_id,
    match_count,
    win_count,
    loss_count,
    win_rate
FROM ranked
WHERE rnk <= 3
ORDER BY match_type_group, win_rate DESC, match_count DESC;
$function$;

