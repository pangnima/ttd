'use server'

// 클럽 레이팅 전체 재계산 오케스트레이터.
//   1) 확정 경기 조회(정렬) → 2) 순수 엔진 replayClubRatings → 3) apply_club_rating_snapshot RPC 영속화
// RPC가 owner 권한을 강제하므로, 이 함수는 owner 컨텍스트(확정/수정/삭제)에서만 호출한다.
// 계산은 lib/rating/elo.ts(순수)가 담당하고 이 액션은 조회·영속화만 한다.

import { createClient } from '@/lib/supabase/server'
import { fetchConfirmedMatchesForRating } from '@/lib/queries/ratings'
import { replayClubRatings } from '@/lib/rating/elo'

type ActionResult = { ok: false; error: string } | { ok: true }

export async function recalculateClubRatings(clubId: string): Promise<ActionResult> {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, error: '로그인이 필요합니다.' }

    const { matches, dateByMatchId } = await fetchConfirmedMatchesForRating(clubId)
    const snapshot = replayClubRatings(matches)

    const ratings = Array.from(snapshot.ratings.entries()).map(([userId, state]) => ({
        user_id: userId,
        rating: state.rating,
        matches_played: state.matchesPlayed,
    }))

    const history = snapshot.history.map((h) => ({
        match_id: h.matchId,
        user_id: h.userId,
        rating_before: h.ratingBefore,
        rating_after: h.ratingAfter,
        delta: h.delta,
        created_at: dateByMatchId[h.matchId] || null,
    }))

    const { error } = await supabase.rpc('apply_club_rating_snapshot', {
        p_club_id: clubId,
        p_snapshot: { ratings, history },
    })

    if (error) return { ok: false, error: error.message }
    return { ok: true }
}
