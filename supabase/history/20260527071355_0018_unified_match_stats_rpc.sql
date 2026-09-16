-- 20260527071355 0018_unified_match_stats_rpc
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- p_scope: 'total'(클럽+개인), 'club'(클럽만), 'personal'(개인만)
CREATE OR REPLACE FUNCTION public.get_user_match_stats_unified(p_user_id uuid, p_scope text DEFAULT 'total')
RETURNS json
LANGUAGE sql
STABLE
AS $$
WITH
-- 클럽 매치 기본 (p_scope이 'personal'이면 빈 결과)
club_base AS (
    SELECT
        m.match_type,
        CASE
            WHEN m.match_type = 'singles' AND m.player1_id = p_user_id THEN 'team1'
            WHEN m.match_type = 'singles' AND m.player2_id = p_user_id THEN 'team2'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team1, '{}')) THEN 'team1'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team2, '{}')) THEN 'team2'
        END AS my_side,
        m.winner_id,
        m.result_sets
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true
      AND m.status = 'finished'
      AND p_scope IN ('total', 'club')
      AND (
          m.player1_id = p_user_id
          OR m.player2_id = p_user_id
          OR p_user_id = ANY(COALESCE(m.team1, '{}'))
          OR p_user_id = ANY(COALESCE(m.team2, '{}'))
      )
),
-- 클럽 매치 세트 계산
club_rows AS (
    SELECT
        cb.match_type,
        CASE WHEN cb.winner_id = cb.my_side THEN 1 ELSE 0 END AS is_win,
        CASE WHEN cb.winner_id IS NOT NULL AND cb.winner_id <> 'draw' AND cb.winner_id <> cb.my_side THEN 1 ELSE 0 END AS is_loss,
        CASE WHEN cb.winner_id = 'draw' THEN 1 ELSE 0 END AS is_draw,
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
-- 개인 매치 (p_scope이 'club'이면 빈 결과)
personal_rows AS (
    SELECT
        pm.match_type,
        CASE WHEN pm.winner = 'me' THEN 1 ELSE 0 END AS is_win,
        CASE WHEN pm.winner = 'opponent' THEN 1 ELSE 0 END AS is_loss,
        CASE WHEN pm.winner = 'draw' THEN 1 ELSE 0 END AS is_draw,
        COALESCE(
            (SELECT SUM((s->>'me')::int) FROM jsonb_array_elements(COALESCE(pm.set_scores, '[]'::jsonb)) s), 0
        )::int AS sets_won,
        COALESCE(
            (SELECT SUM((s->>'opp')::int) FROM jsonb_array_elements(COALESCE(pm.set_scores, '[]'::jsonb)) s), 0
        )::int AS sets_lost
    FROM public.personal_matches pm
    WHERE pm.user_id = p_user_id
      AND p_scope IN ('total', 'personal')
),
-- 전체 합산
combined AS (
    SELECT * FROM club_rows
    UNION ALL
    SELECT * FROM personal_rows
),
agg AS (
    SELECT
        match_type,
        COUNT(*)::int AS matches,
        SUM(is_win)::int AS wins,
        SUM(is_loss)::int AS losses,
        SUM(is_draw)::int AS draws,
        COALESCE(SUM(sets_won), 0)::int AS sets_won,
        COALESCE(SUM(sets_lost), 0)::int AS sets_lost
    FROM combined
    GROUP BY match_type
),
empty_stat AS (
    SELECT json_build_object(
        'matches', 0, 'wins', 0, 'losses', 0, 'draws', 0, 'sets_won', 0, 'sets_lost', 0
    ) AS val
)
SELECT json_build_object(
    'singles',
        COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type = 'singles'), (SELECT val FROM empty_stat)),
    'men_doubles',
        COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type = 'men_doubles'), (SELECT val FROM empty_stat)),
    'women_doubles',
        COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type = 'women_doubles'), (SELECT val FROM empty_stat)),
    'mixed_doubles',
        COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type = 'mixed_doubles'), (SELECT val FROM empty_stat))
);
$$;
