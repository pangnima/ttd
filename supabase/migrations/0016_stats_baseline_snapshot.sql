-- ============================================================
-- 0016_stats_baseline_snapshot.sql
-- 서버에서 역추출한 기준 스냅샷 (2026-06-05)
-- 0001~0015는 Supabase MCP apply_migration으로만 관리됐고
-- 로컬 파일이 없었음. 이번 파일부터 버전관리 시작.
--
-- 포함 객체:
--   View  : user_match_participations
--   RPC   : get_user_match_stats        (v1, 레거시 — 미사용)
--   RPC   : get_user_match_stats_v2     (클럽 전용, 오버로드 2종)
--   RPC   : get_user_match_stats_unified (클럽+개인 통합, scope 파라미터)
--   RPC   : get_user_head_to_head       (단식 H2H, 오버로드 2종)
--   RPC   : get_user_head_to_head_unified (클럽+개인 통합 H2H)
--   RPC   : get_user_doubles_court_stats (애드/듀스 코트, 오버로드 2종)
--   RPC   : get_user_partner_stats      (복식 파트너, 오버로드 2종)
--   RPC   : get_club_activity_ranking   (클럽 활동도 랭킹)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- View: user_match_participations
-- 단식/복식 경기를 유저별로 펼쳐서 result(win/loss/draw)를 계산.
-- security_invoker=on, is_fixed=true + status='finished' 필터 적용.
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.user_match_participations
WITH (security_invoker = on) AS
    -- 단식: player1
    SELECT m.id AS match_id,
        m.match_type,
        m.player1_id AS user_id,
            CASE
                WHEN m.winner_id = 'team1' THEN 'win'
                WHEN m.winner_id = 'team2' THEN 'loss'
                WHEN m.winner_id = 'draw'  THEN 'draw'
                ELSE NULL
            END AS result,
        g.club_id
    FROM match_game_matches m
    JOIN match_games g ON g.id = m.match_game_id
    WHERE m.match_type = 'singles'
      AND m.status = 'finished'
      AND g.is_fixed = true
      AND m.player1_id IS NOT NULL
UNION ALL
    -- 단식: player2
    SELECT m.id, m.match_type, m.player2_id,
            CASE
                WHEN m.winner_id = 'team2' THEN 'win'
                WHEN m.winner_id = 'team1' THEN 'loss'
                WHEN m.winner_id = 'draw'  THEN 'draw'
                ELSE NULL
            END,
        g.club_id
    FROM match_game_matches m
    JOIN match_games g ON g.id = m.match_game_id
    WHERE m.match_type = 'singles'
      AND m.status = 'finished'
      AND g.is_fixed = true
      AND m.player2_id IS NOT NULL
UNION ALL
    -- 복식: team1 멤버 전원 unnest
    SELECT m.id, m.match_type, unnest(m.team1),
            CASE
                WHEN m.winner_id = 'team1' THEN 'win'
                WHEN m.winner_id = 'team2' THEN 'loss'
                WHEN m.winner_id = 'draw'  THEN 'draw'
                ELSE NULL
            END,
        g.club_id
    FROM match_game_matches m
    JOIN match_games g ON g.id = m.match_game_id
    WHERE m.match_type <> 'singles'
      AND m.status = 'finished'
      AND g.is_fixed = true
      AND m.team1 IS NOT NULL
UNION ALL
    -- 복식: team2 멤버 전원 unnest
    SELECT m.id, m.match_type, unnest(m.team2),
            CASE
                WHEN m.winner_id = 'team2' THEN 'win'
                WHEN m.winner_id = 'team1' THEN 'loss'
                WHEN m.winner_id = 'draw'  THEN 'draw'
                ELSE NULL
            END,
        g.club_id
    FROM match_game_matches m
    JOIN match_games g ON g.id = m.match_game_id
    WHERE m.match_type <> 'singles'
      AND m.status = 'finished'
      AND g.is_fixed = true
      AND m.team2 IS NOT NULL;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_match_stats (v1, 레거시)
-- 단식/복식 2분기만 반환. 현재 클라이언트에서 호출하지 않음 (데드 RPC).
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_match_stats(p_user_id uuid)
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


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_match_stats_v2 (클럽 전용, 인자 1개 — 레거시 오버로드)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_match_stats_v2(p_user_id uuid)
RETURNS json LANGUAGE sql STABLE AS $$
WITH base AS (
    SELECT m.id AS match_id, m.match_type,
        CASE
            WHEN m.match_type = 'singles' AND m.player1_id = p_user_id THEN 'team1'
            WHEN m.match_type = 'singles' AND m.player2_id = p_user_id THEN 'team2'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team1, '{}')) THEN 'team1'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team2, '{}')) THEN 'team2'
        END AS my_side,
        m.winner_id, m.result_sets
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true AND m.status = 'finished'
      AND (m.player1_id = p_user_id OR m.player2_id = p_user_id
           OR p_user_id = ANY(COALESCE(m.team1, '{}'))
           OR p_user_id = ANY(COALESCE(m.team2, '{}')))
),
sets_per_match AS (
    SELECT b.match_id, b.match_type, b.my_side, b.winner_id,
        COALESCE((SELECT SUM(CASE WHEN b.my_side='team1' THEN (s->>'team1')::int ELSE (s->>'team2')::int END)
                  FROM jsonb_array_elements(COALESCE(b.result_sets,'[]'::jsonb)) s), 0) AS sets_won,
        COALESCE((SELECT SUM(CASE WHEN b.my_side='team1' THEN (s->>'team2')::int ELSE (s->>'team1')::int END)
                  FROM jsonb_array_elements(COALESCE(b.result_sets,'[]'::jsonb)) s), 0) AS sets_lost
    FROM base b WHERE b.my_side IS NOT NULL
),
agg AS (
    SELECT match_type,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE winner_id = my_side)::int AS wins,
        COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id <> 'draw' AND winner_id <> my_side)::int AS losses,
        COUNT(*) FILTER (WHERE winner_id = 'draw')::int AS draws,
        COALESCE(SUM(sets_won),0)::int AS sets_won,
        COALESCE(SUM(sets_lost),0)::int AS sets_lost
    FROM sets_per_match GROUP BY match_type
),
empty_stat AS (SELECT json_build_object('matches',0,'wins',0,'losses',0,'draws',0,'sets_won',0,'sets_lost',0) AS val)
SELECT json_build_object(
    'singles',       COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='singles'),       (SELECT val FROM empty_stat)),
    'men_doubles',   COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='men_doubles'),   (SELECT val FROM empty_stat)),
    'women_doubles', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='women_doubles'), (SELECT val FROM empty_stat)),
    'mixed_doubles', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='mixed_doubles'), (SELECT val FROM empty_stat))
);
$$;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_match_stats_v2 (p_club_id 오버로드)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_match_stats_v2(p_user_id uuid, p_club_id uuid DEFAULT NULL)
RETURNS json LANGUAGE sql STABLE AS $$
WITH base AS (
    SELECT m.id AS match_id, m.match_type,
        CASE
            WHEN m.match_type = 'singles' AND m.player1_id = p_user_id THEN 'team1'
            WHEN m.match_type = 'singles' AND m.player2_id = p_user_id THEN 'team2'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team1, '{}')) THEN 'team1'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team2, '{}')) THEN 'team2'
        END AS my_side,
        m.winner_id, m.result_sets
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true AND m.status = 'finished'
      AND (p_club_id IS NULL OR g.club_id = p_club_id)
      AND (m.player1_id = p_user_id OR m.player2_id = p_user_id
           OR p_user_id = ANY(COALESCE(m.team1, '{}'))
           OR p_user_id = ANY(COALESCE(m.team2, '{}')))
),
sets_per_match AS (
    SELECT b.match_id, b.match_type, b.my_side, b.winner_id,
        COALESCE((SELECT SUM(CASE WHEN b.my_side='team1' THEN (s->>'team1')::int ELSE (s->>'team2')::int END)
                  FROM jsonb_array_elements(COALESCE(b.result_sets,'[]'::jsonb)) s), 0) AS sets_won,
        COALESCE((SELECT SUM(CASE WHEN b.my_side='team1' THEN (s->>'team2')::int ELSE (s->>'team1')::int END)
                  FROM jsonb_array_elements(COALESCE(b.result_sets,'[]'::jsonb)) s), 0) AS sets_lost
    FROM base b WHERE b.my_side IS NOT NULL
),
agg AS (
    SELECT match_type,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE winner_id = my_side)::int AS wins,
        COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id <> 'draw' AND winner_id <> my_side)::int AS losses,
        COUNT(*) FILTER (WHERE winner_id = 'draw')::int AS draws,
        COALESCE(SUM(sets_won),0)::int AS sets_won,
        COALESCE(SUM(sets_lost),0)::int AS sets_lost
    FROM sets_per_match GROUP BY match_type
),
empty_stat AS (SELECT json_build_object('matches',0,'wins',0,'losses',0,'draws',0,'sets_won',0,'sets_lost',0) AS val)
SELECT json_build_object(
    'singles',       COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='singles'),       (SELECT val FROM empty_stat)),
    'men_doubles',   COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='men_doubles'),   (SELECT val FROM empty_stat)),
    'women_doubles', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='women_doubles'), (SELECT val FROM empty_stat)),
    'mixed_doubles', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='mixed_doubles'), (SELECT val FROM empty_stat))
);
$$;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_match_stats_unified (클럽+개인 통합, scope 파라미터)
-- p_scope: 'total' | 'club' | 'personal'
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_match_stats_unified(p_user_id uuid, p_scope text DEFAULT 'total')
RETURNS json LANGUAGE sql STABLE AS $$
WITH
club_base AS (
    SELECT m.match_type,
        CASE
            WHEN m.match_type = 'singles' AND m.player1_id = p_user_id THEN 'team1'
            WHEN m.match_type = 'singles' AND m.player2_id = p_user_id THEN 'team2'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team1,'{}')) THEN 'team1'
            WHEN m.match_type <> 'singles' AND p_user_id = ANY(COALESCE(m.team2,'{}')) THEN 'team2'
        END AS my_side,
        m.winner_id, m.result_sets
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true AND m.status = 'finished'
      AND p_scope IN ('total','club')
      AND (m.player1_id = p_user_id OR m.player2_id = p_user_id
           OR p_user_id = ANY(COALESCE(m.team1,'{}'))
           OR p_user_id = ANY(COALESCE(m.team2,'{}')))
),
club_rows AS (
    SELECT cb.match_type,
        CASE WHEN cb.winner_id = cb.my_side THEN 1 ELSE 0 END AS is_win,
        CASE WHEN cb.winner_id IS NOT NULL AND cb.winner_id <> 'draw' AND cb.winner_id <> cb.my_side THEN 1 ELSE 0 END AS is_loss,
        CASE WHEN cb.winner_id = 'draw' THEN 1 ELSE 0 END AS is_draw,
        COALESCE((SELECT SUM(CASE WHEN cb.my_side='team1' THEN (s->>'team1')::int ELSE (s->>'team2')::int END)
                  FROM jsonb_array_elements(COALESCE(cb.result_sets,'[]'::jsonb)) s), 0)::int AS sets_won,
        COALESCE((SELECT SUM(CASE WHEN cb.my_side='team1' THEN (s->>'team2')::int ELSE (s->>'team1')::int END)
                  FROM jsonb_array_elements(COALESCE(cb.result_sets,'[]'::jsonb)) s), 0)::int AS sets_lost
    FROM club_base cb WHERE cb.my_side IS NOT NULL
),
personal_rows AS (
    SELECT pm.match_type,
        CASE WHEN pm.winner = 'me'       THEN 1 ELSE 0 END AS is_win,
        CASE WHEN pm.winner = 'opponent' THEN 1 ELSE 0 END AS is_loss,
        CASE WHEN pm.winner = 'draw'     THEN 1 ELSE 0 END AS is_draw,
        COALESCE((SELECT SUM((s->>'me')::int)  FROM jsonb_array_elements(COALESCE(pm.set_scores,'[]'::jsonb)) s), 0)::int AS sets_won,
        COALESCE((SELECT SUM((s->>'opp')::int) FROM jsonb_array_elements(COALESCE(pm.set_scores,'[]'::jsonb)) s), 0)::int AS sets_lost
    FROM public.personal_matches pm
    WHERE pm.user_id = p_user_id AND p_scope IN ('total','personal')
),
combined AS (SELECT * FROM club_rows UNION ALL SELECT * FROM personal_rows),
agg AS (
    SELECT match_type,
        COUNT(*)::int AS matches,
        SUM(is_win)::int AS wins, SUM(is_loss)::int AS losses, SUM(is_draw)::int AS draws,
        COALESCE(SUM(sets_won),0)::int AS sets_won, COALESCE(SUM(sets_lost),0)::int AS sets_lost
    FROM combined GROUP BY match_type
),
empty_stat AS (SELECT json_build_object('matches',0,'wins',0,'losses',0,'draws',0,'sets_won',0,'sets_lost',0) AS val)
SELECT json_build_object(
    'singles',       COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='singles'),       (SELECT val FROM empty_stat)),
    'men_doubles',   COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='men_doubles'),   (SELECT val FROM empty_stat)),
    'women_doubles', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='women_doubles'), (SELECT val FROM empty_stat)),
    'mixed_doubles', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.match_type='mixed_doubles'), (SELECT val FROM empty_stat))
);
$$;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_head_to_head (단식 H2H, 오버로드 2종)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_head_to_head(p_user_id uuid)
RETURNS TABLE(opponent_id uuid, matches integer, wins integer, losses integer, draws integer)
LANGUAGE sql STABLE AS $$
    WITH me AS (
        SELECT match_id, result FROM user_match_participations
        WHERE user_id = p_user_id AND match_type = 'singles'
    ),
    opp AS (
        SELECT p.match_id, p.user_id AS opponent_id
        FROM user_match_participations p
        JOIN me ON me.match_id = p.match_id
        WHERE p.user_id <> p_user_id AND p.match_type = 'singles'
    )
    SELECT opp.opponent_id,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE me.result = 'win')::int  AS wins,
        COUNT(*) FILTER (WHERE me.result = 'loss')::int AS losses,
        COUNT(*) FILTER (WHERE me.result = 'draw')::int AS draws
    FROM opp JOIN me USING (match_id)
    GROUP BY opp.opponent_id ORDER BY matches DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_user_head_to_head(p_user_id uuid, p_club_id uuid DEFAULT NULL)
RETURNS TABLE(opponent_id uuid, matches integer, wins integer, losses integer, draws integer)
LANGUAGE sql STABLE AS $$
    WITH me AS (
        SELECT match_id, result FROM user_match_participations
        WHERE user_id = p_user_id AND match_type = 'singles'
          AND (p_club_id IS NULL OR club_id = p_club_id)
    ),
    opp AS (
        SELECT p.match_id, p.user_id AS opponent_id
        FROM user_match_participations p
        JOIN me ON me.match_id = p.match_id
        WHERE p.user_id <> p_user_id AND p.match_type = 'singles'
    )
    SELECT opp.opponent_id,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE me.result = 'win')::int  AS wins,
        COUNT(*) FILTER (WHERE me.result = 'loss')::int AS losses,
        COUNT(*) FILTER (WHERE me.result = 'draw')::int AS draws
    FROM opp JOIN me USING (match_id)
    GROUP BY opp.opponent_id ORDER BY matches DESC;
$$;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_head_to_head_unified (클럽+개인 통합 H2H)
-- ──────────────────────────────────────────────────────────────
-- 정의가 길어 주석만 요약. 전체 정의는 서버에서 조회.
-- 검증 결과: 클럽(단식+복식) + 개인매치를 opponent_user_id 기준으로 병합.
-- 복식에서 상대 2명 각각에 대해 경기 수를 카운트 (의도된 동작).
-- ──────────────────────────────────────────────────────────────


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_doubles_court_stats (애드/듀스 코트, 오버로드 2종)
-- 판정 기준: team1_ad_player_id = p_user_id → 'ad', 그 외 → 'deuce'
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_doubles_court_stats(p_user_id uuid, p_club_id uuid DEFAULT NULL)
RETURNS json LANGUAGE sql STABLE AS $$
WITH base AS (
    SELECT
        CASE
            WHEN p_user_id = ANY(COALESCE(m.team1,'{}')) THEN 'team1'
            WHEN p_user_id = ANY(COALESCE(m.team2,'{}')) THEN 'team2'
        END AS my_side,
        CASE
            WHEN p_user_id = ANY(COALESCE(m.team1,'{}')) AND m.team1_ad_player_id = p_user_id THEN 'ad'
            WHEN p_user_id = ANY(COALESCE(m.team2,'{}')) AND m.team2_ad_player_id = p_user_id THEN 'ad'
            ELSE 'deuce'
        END AS court,
        m.winner_id
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true AND m.status = 'finished'
      AND m.match_type IN ('men_doubles','women_doubles','mixed_doubles')
      AND (p_club_id IS NULL OR g.club_id = p_club_id)
      AND (p_user_id = ANY(COALESCE(m.team1,'{}')) OR p_user_id = ANY(COALESCE(m.team2,'{}')))
),
agg AS (
    SELECT court,
        COUNT(*)::int AS matches,
        COUNT(*) FILTER (WHERE winner_id = my_side)::int AS wins,
        COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id <> 'draw' AND winner_id <> my_side)::int AS losses,
        COUNT(*) FILTER (WHERE winner_id = 'draw')::int AS draws
    FROM base WHERE my_side IS NOT NULL GROUP BY court
),
empty_stat AS (SELECT json_build_object('matches',0,'wins',0,'losses',0,'draws',0) AS val)
SELECT json_build_object(
    'ad',    COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.court='ad'),    (SELECT val FROM empty_stat)),
    'deuce', COALESCE((SELECT row_to_json(a) FROM agg a WHERE a.court='deuce'), (SELECT val FROM empty_stat))
);
$$;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_user_partner_stats (복식 파트너, 오버로드 2종)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_partner_stats(p_user_id uuid, p_club_id uuid DEFAULT NULL)
RETURNS TABLE(partner_id uuid, matches integer, wins integer, losses integer, draws integer)
LANGUAGE sql STABLE AS $$
WITH base AS (
    SELECT
        CASE
            WHEN p_user_id = ANY(COALESCE(m.team1,'{}')) THEN 'team1'
            WHEN p_user_id = ANY(COALESCE(m.team2,'{}')) THEN 'team2'
        END AS my_side,
        CASE
            WHEN p_user_id = ANY(COALESCE(m.team1,'{}')) THEN m.team1
            ELSE m.team2
        END AS my_team,
        m.winner_id
    FROM public.match_game_matches m
    JOIN public.match_games g ON g.id = m.match_game_id
    WHERE g.is_fixed = true AND m.status = 'finished'
      AND m.match_type IN ('men_doubles','women_doubles','mixed_doubles')
      AND (p_club_id IS NULL OR g.club_id = p_club_id)
      AND (p_user_id = ANY(COALESCE(m.team1,'{}')) OR p_user_id = ANY(COALESCE(m.team2,'{}')))
),
unnested AS (SELECT unnest(my_team) AS pid, my_side, winner_id FROM base WHERE my_side IS NOT NULL)
SELECT pid AS partner_id,
    COUNT(*)::int AS matches,
    COUNT(*) FILTER (WHERE winner_id = my_side)::int AS wins,
    COUNT(*) FILTER (WHERE winner_id IS NOT NULL AND winner_id <> 'draw' AND winner_id <> my_side)::int AS losses,
    COUNT(*) FILTER (WHERE winner_id = 'draw')::int AS draws
FROM unnested WHERE pid <> p_user_id
GROUP BY pid ORDER BY matches DESC;
$$;


-- ──────────────────────────────────────────────────────────────
-- RPC: get_club_activity_ranking
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_club_activity_ranking(
    p_club_id uuid,
    p_since timestamptz DEFAULT NOW() - INTERVAL '30 days'
)
RETURNS TABLE(user_id uuid, match_count bigint, win_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
WITH club_matches AS (
    SELECT m.id, m.player1_id, m.player2_id, m.team1, m.team2, m.winner_id
    FROM match_game_matches m
    JOIN match_games mg ON mg.id = m.match_game_id
    WHERE mg.club_id = p_club_id
      AND mg.is_fixed = true
      AND mg.date::timestamptz >= p_since
      AND m.status = 'finished'
),
participants AS (
    SELECT player1_id AS uid, CASE WHEN winner_id='team1' THEN 1 ELSE 0 END AS win FROM club_matches WHERE player1_id IS NOT NULL
    UNION ALL
    SELECT player2_id,        CASE WHEN winner_id='team2' THEN 1 ELSE 0 END         FROM club_matches WHERE player2_id IS NOT NULL
    UNION ALL
    SELECT unnest(team1),     CASE WHEN winner_id='team1' THEN 1 ELSE 0 END         FROM club_matches WHERE team1 IS NOT NULL
    UNION ALL
    SELECT unnest(team2),     CASE WHEN winner_id='team2' THEN 1 ELSE 0 END         FROM club_matches WHERE team2 IS NOT NULL
)
SELECT uid AS user_id, COUNT(*) AS match_count, SUM(win) AS win_count
FROM participants GROUP BY uid ORDER BY match_count DESC, win_count DESC LIMIT 20;
$$;
