-- 20260527032523 0017_fix_user_match_participations_is_fixed
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16
-- user_match_participations 뷰에 is_fixed=true 조건 추가.
-- head-to-head RPC가 이 뷰를 기반으로 하므로, 미확정 매치가
-- 4분기 통계(is_fixed 기준)와 불일치하는 버그를 수정.
CREATE OR REPLACE VIEW user_match_participations
WITH (security_invoker = on)
AS
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

  SELECT m.id AS match_id,
    m.match_type,
    m.player2_id AS user_id,
    CASE
      WHEN m.winner_id = 'team2' THEN 'win'
      WHEN m.winner_id = 'team1' THEN 'loss'
      WHEN m.winner_id = 'draw'  THEN 'draw'
      ELSE NULL
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type = 'singles'
    AND m.status = 'finished'
    AND g.is_fixed = true
    AND m.player2_id IS NOT NULL

UNION ALL

  SELECT m.id AS match_id,
    m.match_type,
    unnest(m.team1) AS user_id,
    CASE
      WHEN m.winner_id = 'team1' THEN 'win'
      WHEN m.winner_id = 'team2' THEN 'loss'
      WHEN m.winner_id = 'draw'  THEN 'draw'
      ELSE NULL
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type <> 'singles'
    AND m.status = 'finished'
    AND g.is_fixed = true
    AND m.team1 IS NOT NULL

UNION ALL

  SELECT m.id AS match_id,
    m.match_type,
    unnest(m.team2) AS user_id,
    CASE
      WHEN m.winner_id = 'team2' THEN 'win'
      WHEN m.winner_id = 'team1' THEN 'loss'
      WHEN m.winner_id = 'draw'  THEN 'draw'
      ELSE NULL
    END AS result,
    g.club_id
  FROM match_game_matches m
  JOIN match_games g ON g.id = m.match_game_id
  WHERE m.match_type <> 'singles'
    AND m.status = 'finished'
    AND g.is_fixed = true
    AND m.team2 IS NOT NULL;

