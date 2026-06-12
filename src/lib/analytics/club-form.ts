import { getMatchOutcome } from '@/lib/analytics/shared'
import type { Match } from '@/types'

// ── 클럽 멤버별 승/패·최근폼 집계 ──────────────────────────────
//
// 클럽 랭킹 리더보드(승패 + 최근 5경기 폼)용. fetchConfirmedMatchesForRating가
// 시간 오름차순(date→round→slot→order→id)으로 정렬해 반환하므로 그 순서를 신뢰한다.

export type ClubMemberForm = {
    wins: number
    losses: number
    draws: number
    /** 최근 N경기 (과거→최신, 왼쪽=과거. RecentFormCard와 동일 방향) */
    recent: ('W' | 'L' | 'D')[]
}

// 경기 참가자 전원의 userId (단식=양 선수, 복식=양 팀 전원).
function participantIds(m: Match): string[] {
    if (m.matchType === 'singles') {
        return [m.player1Id, m.player2Id].filter((id): id is string => !!id)
    }
    return [...(m.team1 ?? []), ...(m.team2 ?? [])]
}

export function aggregateClubMemberForms(matches: Match[], recentN = 5): Map<string, ClubMemberForm> {
    const map = new Map<string, ClubMemberForm>()

    for (const m of matches) {
        if (!m.result) continue
        for (const uid of participantIds(m)) {
            const outcome = getMatchOutcome(m, uid) // 'win' | 'loss' | 'draw'
            const f = map.get(uid) ?? { wins: 0, losses: 0, draws: 0, recent: [] }

            if (outcome === 'win') f.wins++
            else if (outcome === 'loss') f.losses++
            else f.draws++

            f.recent.push(outcome === 'win' ? 'W' : outcome === 'loss' ? 'L' : 'D')
            if (f.recent.length > recentN) f.recent.shift()

            map.set(uid, f)
        }
    }

    return map
}
