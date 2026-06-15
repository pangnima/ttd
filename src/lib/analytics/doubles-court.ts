import type { CourtStat, DoublesCourtStats } from '@/lib/stats'
import {
    type BundleWithMatches, type BundleWithPersonal,
    isUserTeam1, getMatchOutcome,
} from '@/lib/analytics/shared'

type CourtSide = 'ad' | 'deuce'

function emptyCourtStat(): CourtStat {
    return { matches: 0, wins: 0, losses: 0, draws: 0 }
}

function tally(stat: CourtStat, outcome: 'win' | 'loss' | 'draw') {
    stat.matches++
    if (outcome === 'win') stat.wins++
    else if (outcome === 'loss') stat.losses++
    else stat.draws++
}

/**
 * 복식 경기를 사용자가 맡은 코트 사이드(애드=백 / 듀스=포)별로 집계.
 * - 클럽 경기: 사용자가 속한 팀의 AdPlayerId === userId 이면 애드, 아니면 듀스.
 * - 개인 경기(분해본): setScores[0].myAd === 'me' 이면 애드, 그 외(파트너/미지정)는 듀스.
 *   → 코트 미지정 세트는 듀스에 포함(DoublesCourtStatsCard 정책과 일치).
 * - 단식은 양쪽 모두 제외.
 */
export function aggregateByDoublesCourtSide(
    bundle: BundleWithMatches & BundleWithPersonal,
    userId: string,
): DoublesCourtStats {
    const result: DoublesCourtStats = { ad: emptyCourtStat(), deuce: emptyCourtStat() }

    // 클럽 경기: team*AdPlayerId로 사용자 코트 판정
    for (const m of bundle.matches) {
        if (m.matchType === 'singles' || !m.result) continue
        const isTeam1 = isUserTeam1(m, userId)
        const myAdPlayerId = isTeam1 ? m.team1AdPlayerId : m.team2AdPlayerId
        const side: CourtSide = myAdPlayerId === userId ? 'ad' : 'deuce'
        tally(result[side], getMatchOutcome(m, userId))
    }

    // 개인 경기(세트별 분해본): setScores[0].myAd로 사용자 코트 판정
    for (const pm of bundle.personalMatches) {
        if (pm.matchType === 'singles') continue
        const side: CourtSide = pm.setScores[0]?.myAd === 'me' ? 'ad' : 'deuce'
        const outcome = pm.winner === 'me' ? 'win' : pm.winner === 'opponent' ? 'loss' : 'draw'
        tally(result[side], outcome)
    }

    return result
}
