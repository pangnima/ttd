-- 20260529062418 club_dashboard_officer_approve_and_activity_ranking
-- replayed from supabase_migrations.schema_migrations (dev xiwwbgltkbvxdzxxxoba), 2026-09-16

-- officer가 pending 회원의 status를 approved/rejected로 변경할 수 있도록 RLS 정책 추가
CREATE POLICY "club_members_update_pending_by_officer"
ON public.club_members
FOR UPDATE
TO authenticated
USING (
    is_club_owner_or_officer(club_id, auth.uid())
    AND status = 'pending'
)
WITH CHECK (
    status IN ('approved', 'rejected')
);

-- 클럽 활동도 랭킹 RPC: 지정 기간 내 경기 참여 횟수·승수를 유저별로 집계
CREATE OR REPLACE FUNCTION get_club_activity_ranking(
    p_club_id uuid,
    p_since timestamptz DEFAULT (now() - interval '30 days')
)
RETURNS TABLE(user_id uuid, match_count bigint, win_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH club_matches AS (
        SELECT
            m.id,
            m.player1_id,
            m.player2_id,
            m.team1,
            m.team2,
            m.winner_id
        FROM match_game_matches m
        JOIN match_games mg ON mg.id = m.match_game_id
        WHERE mg.club_id = p_club_id
          AND mg.is_fixed = true
          AND mg.date::timestamptz >= p_since
          AND m.status = 'finished'
    ),
    participants AS (
        SELECT player1_id AS uid,
               CASE WHEN winner_id = 'team1' THEN 1 ELSE 0 END AS win
        FROM club_matches WHERE player1_id IS NOT NULL
        UNION ALL
        SELECT player2_id AS uid,
               CASE WHEN winner_id = 'team2' THEN 1 ELSE 0 END AS win
        FROM club_matches WHERE player2_id IS NOT NULL
        UNION ALL
        SELECT unnest(team1) AS uid,
               CASE WHEN winner_id = 'team1' THEN 1 ELSE 0 END AS win
        FROM club_matches WHERE team1 IS NOT NULL
        UNION ALL
        SELECT unnest(team2) AS uid,
               CASE WHEN winner_id = 'team2' THEN 1 ELSE 0 END AS win
        FROM club_matches WHERE team2 IS NOT NULL
    )
    SELECT
        uid AS user_id,
        COUNT(*)      AS match_count,
        SUM(win)      AS win_count
    FROM participants
    GROUP BY uid
    ORDER BY match_count DESC, win_count DESC
    LIMIT 20;
$$;

